import { syncReservation } from './icalSync.js';

// Gestionnaire du formulaire de réservation
document.getElementById('reservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        guestName: document.getElementById('guestName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value
    };

    try {
        const result = await syncReservation(formData);
        
        if (result.success) {
            showMessage('Réservation confirmée avec succès !', 'success');
            document.getElementById('reservationForm').reset();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Une erreur est survenue lors de la réservation', 'error');
        console.error('Erreur:', error);
    }
});

// Fonction pour afficher les messages
function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
} 