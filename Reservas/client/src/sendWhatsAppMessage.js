import axios from 'axios';

const sendWhatsAppMessage = async (reservasLiberadas, message, user) => {

    const idInstance = user.idInstance; 
    const apiTokenInstance = user.apiTokenInstance; 


    for (const reserva of reservasLiberadas) {
        const phoneNumber = reserva.paciente.telefono;
        
        const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;

        const data = {
            chatId: `${phoneNumber}@c.us`,
            message: message,
        };

        try {
            await axios.post(url, data);
        } catch (error) {
            console.error(`Error sending WhatsApp message to ${phoneNumber}:`, error);
        }
    }
};

export default sendWhatsAppMessage;