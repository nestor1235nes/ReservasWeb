### MERN Stack CRUD with JWT

This is a web application project using React, with a Nodejs Backend using Express and Mongodb as Database (MERN Stack)

### Installation with docker-compose (Recommended)

```sh
docker-compose up -d
npm run dev
```

### Deployment

```sh
git clone https://github.com/FaztWeb/mern-tasks-auth
cd mern-tasks-auth
npm i
npm run build
npm start
```

> You need to have a Mongodb database running

## Email (SMTP) setup

To enable email confirmations/reminders, configure SMTP credentials (Brevo/Sendinblue recommended free tier):

- BREVO_SMTP_HOST=smtp-relay.brevo.com
- BREVO_SMTP_PORT=587
- BREVO_SMTP_USER=your_brevo_smtp_login
- BREVO_SMTP_PASS=your_brevo_smtp_password
- FROM_EMAIL=agenda@yourdomain.com
- FROM_NAME=Agenda

Optional (dynamic From per professional):

- BREVO_ENFORCE_DOMAIN=true
- BREVO_VERIFIED_DOMAIN=yourdomain.com

With these, if a professional has email like nombre@yourdomain.com, emails will be sent with From "Nombre <nombre@yourdomain.com>". If the email domain does not match your verified domain, the system falls back to FROM_EMAIL but sets Reply-To to the professional’s email so replies go to them.

Endpoints:

- POST /api/notifications/email (auth required): send an arbitrary email.
- POST /api/reserva/:id/confirm-link (auth required): generates a confirmation link and, if the reserva.notificationChannel is 'email' and the patient has email, sends the confirmation email automatically.

You can test with the request collection in `requests/notifications.http`.