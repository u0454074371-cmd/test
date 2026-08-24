// ==================== Restaurantbeheer instellingen ====================
// Er staat hier geen wachtwoord meer in. In plaats daarvan stelt de eerste
// persoon die op "Restaurant beheer" klikt zelf een e-mailadres en
// wachtwoord in. Dit wordt opgeslagen in de database (onder "siteAdmin").
// Daarna moet iedereen met dat e-mailadres en wachtwoord inloggen om bij
// het beheer te kunnen. Zie admin-login.js voor de logica hiervan.

// Aantal keer dat iemand mag inloggen voordat het inlogscherm tijdelijk
// wordt geblokkeerd.
const ADMIN_MAX_POGINGEN = 3;

// Hoe lang (in minuten) het inloggen geblokkeerd is nadat het
// ADMIN_MAX_POGINGEN keer achter elkaar fout is gegaan.
const ADMIN_LOCKOUT_MINUTEN = 2;
