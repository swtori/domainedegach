// Configuration Firebase
const firebaseConfig = {
    // Votre configuration Firebase ici
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// URLs iCal Gîtes de France
const GDF_READ_URL = "URL_DE_LECTURE_GDF"; // À remplacer
const GDF_WRITE_URL = "URL_D_ECRITURE_GDF"; // À remplacer

// Fonction pour récupérer les réservations GDF
async function getGDFReservations() {
    try {
        const response = await fetch(GDF_READ_URL);
        const icalData = await response.text();
        return parseICal(icalData);
    } catch (error) {
        console.error('Erreur lors de la récupération des réservations GDF:', error);
        return [];
    }
}

// Fonction pour envoyer une réservation vers GDF
async function sendReservationToGDF(startDate, endDate, guestName) {
    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Domaine de Gach//FR
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Réservation - ${guestName}
END:VEVENT
END:VCALENDAR`;

    try {
        const response = await fetch(GDF_WRITE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/calendar',
            },
            body: icalContent
        });
        return response.ok;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la réservation:', error);
        return false;
    }
}

// Fonction pour parser le contenu iCal
function parseICal(icalContent) {
    const reservations = [];
    const lines = icalContent.split('\n');
    let currentEvent = null;

    for (const line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) {
            currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
            if (currentEvent) {
                reservations.push(currentEvent);
            }
            currentEvent = null;
        } else if (currentEvent) {
            if (line.startsWith('DTSTART:')) {
                currentEvent.start = line.substring(8);
            } else if (line.startsWith('DTEND:')) {
                currentEvent.end = line.substring(6);
            } else if (line.startsWith('SUMMARY:')) {
                currentEvent.summary = line.substring(8);
            }
        }
    }

    return reservations;
}

// Fonction pour formater la date au format iCal
function formatDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Fonction pour vérifier la disponibilité
async function checkAvailability(startDate, endDate) {
    const gdfReservations = await getGDFReservations();
    
    for (const reservation of gdfReservations) {
        const resStart = new Date(reservation.start);
        const resEnd = new Date(reservation.end);
        
        if ((startDate >= resStart && startDate < resEnd) ||
            (endDate > resStart && endDate <= resEnd) ||
            (startDate <= resStart && endDate >= resEnd)) {
            return false;
        }
    }
    
    return true;
}

// Fonction pour synchroniser une nouvelle réservation
async function syncReservation(reservationData) {
    try {
        // Vérifier la disponibilité
        const isAvailable = await checkAvailability(
            new Date(reservationData.startDate),
            new Date(reservationData.endDate)
        );

        if (!isAvailable) {
            throw new Error('Dates non disponibles');
        }

        // Envoyer à GDF
        const success = await sendReservationToGDF(
            new Date(reservationData.startDate),
            new Date(reservationData.endDate),
            reservationData.guestName
        );

        if (!success) {
            throw new Error('Erreur lors de la synchronisation avec GDF');
        }

        // Sauvegarder dans Firebase
        await db.collection('reservations').add({
            ...reservationData,
            syncedWithGDF: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, message: 'Réservation synchronisée avec succès' };
    } catch (error) {
        console.error('Erreur de synchronisation:', error);
        return { success: false, message: error.message };
    }
}

// Export des fonctions
export {
    syncReservation,
    checkAvailability,
    getGDFReservations
}; 