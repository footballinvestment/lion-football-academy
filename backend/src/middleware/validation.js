const validator = require('validator');

// Általános validációs szabályok
const validationRules = {
    // Szöveg validáció
    isText: (value, options = {}) => {
        const { min = 1, max = 255, required = false } = options;
        
        if (!value || value.trim() === '') {
            return required ? 'Ez a mező kötelező' : null;
        }
        
        const trimmed = value.trim();
        if (trimmed.length < min) {
            return `Legalább ${min} karakter szükséges`;
        }
        if (trimmed.length > max) {
            return `Legfeljebb ${max} karakter megengedett`;
        }
        
        return null;
    },

    // Email validáció
    isEmail: (value, required = false) => {
        if (!value || value.trim() === '') {
            return required ? 'Email cím kötelező' : null;
        }
        
        if (!validator.isEmail(value)) {
            return 'Érvénytelen email cím formátum';
        }
        
        return null;
    },

    // Telefonszám validáció
    isPhone: (value, required = false) => {
        if (!value || value.trim() === '') {
            return required ? 'Telefonszám kötelező' : null;
        }
        
        // Magyar telefonszám formátumok elfogadása
        const phoneRegex = /^(\+36|06)?[1-9][0-9]{7,8}$/;
        const cleanPhone = value.replace(/[\s\-()]/g, '');
        
        if (!phoneRegex.test(cleanPhone)) {
            return 'Érvénytelen telefonszám formátum';
        }
        
        return null;
    },

    // Dátum validáció
    isDate: (value, options = {}) => {
        const { required = false, minAge = null, maxAge = null, future = false, past = false } = options;
        
        if (!value) {
            return required ? 'Dátum kötelező' : null;
        }
        
        if (!validator.isDate(value)) {
            return 'Érvénytelen dátum formátum';
        }
        
        const date = new Date(value);
        const today = new Date();
        
        if (future && date <= today) {
            return 'A dátum jövőbeli kell legyen';
        }
        
        if (past && date >= today) {
            return 'A dátum múltbeli kell legyen';
        }
        
        if (minAge || maxAge) {
            const age = today.getFullYear() - date.getFullYear();
            const monthDiff = today.getMonth() - date.getMonth();
            
            let actualAge = age;
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
                actualAge--;
            }
            
            if (minAge && actualAge < minAge) {
                return `Minimum ${minAge} éves korhatár`;
            }
            
            if (maxAge && actualAge > maxAge) {
                return `Maximum ${maxAge} éves korhatár`;
            }
        }
        
        return null;
    },

    // Időpont validáció
    isTime: (value, required = false) => {
        if (!value) {
            return required ? 'Időpont kötelező' : null;
        }
        
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(value)) {
            return 'Érvénytelen időpont formátum (HH:MM)';
        }
        
        return null;
    },

    // Szám validáció
    isNumber: (value, options = {}) => {
        const { required = false, min = null, max = null, integer = false } = options;
        
        if (value === null || value === undefined || value === '') {
            return required ? 'Szám megadása kötelező' : null;
        }
        
        const num = Number(value);
        if (isNaN(num)) {
            return 'Érvényes számot adjon meg';
        }
        
        if (integer && !Number.isInteger(num)) {
            return 'Egész számot adjon meg';
        }
        
        if (min !== null && num < min) {
            return `A szám legalább ${min} kell legyen`;
        }
        
        if (max !== null && num > max) {
            return `A szám legfeljebb ${max} lehet`;
        }
        
        return null;
    },

    // Enum validáció
    isEnum: (value, allowedValues, required = false) => {
        if (!value) {
            return required ? 'Választás kötelező' : null;
        }
        
        if (!allowedValues.includes(value)) {
            return `Érvénytelen érték. Megengedett: ${allowedValues.join(', ')}`;
        }
        
        return null;
    }
};

// Játékos validáció
const validatePlayer = (req, res, next) => {
    const errors = [];
    const { name, birth_date, position, dominant_foot, parent_email, parent_phone, parent_name } = req.body;

    // Név validáció
    const nameError = validationRules.isText(name, { min: 2, max: 100, required: true });
    if (nameError) errors.push(`Név: ${nameError}`);

    // Születési dátum validáció
    const birthDateError = validationRules.isDate(birth_date, { 
        required: true, 
        past: true, 
        minAge: 5, 
        maxAge: 18 
    });
    if (birthDateError) errors.push(`Születési dátum: ${birthDateError}`);

    // Pozíció validáció (opcionális)
    if (position) {
        const positionError = validationRules.isEnum(position, ['kapus', 'védő', 'középpályás', 'támadó']);
        if (positionError) errors.push(`Pozíció: ${positionError}`);
    }

    // Domináns láb validáció (opcionális)
    if (dominant_foot) {
        const footError = validationRules.isEnum(dominant_foot, ['jobb', 'bal', 'mindkettő']);
        if (footError) errors.push(`Domináns láb: ${footError}`);
    }

    // Szülő email validáció (opcionális)
    if (parent_email) {
        const emailError = validationRules.isEmail(parent_email);
        if (emailError) errors.push(`Szülő email: ${emailError}`);
    }

    // Szülő telefon validáció (opcionális)
    if (parent_phone) {
        const phoneError = validationRules.isPhone(parent_phone);
        if (phoneError) errors.push(`Szülő telefon: ${phoneError}`);
    }

    // Ha van szülői elérhetőség, akkor a név is kötelező
    if ((parent_email || parent_phone) && !parent_name) {
        errors.push('Szülő neve kötelező, ha elérhetőség van megadva');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

// Csapat validáció
const validateTeam = (req, res, next) => {
    const errors = [];
    const { name, age_group, coach_name } = req.body;

    // Név validáció
    const nameError = validationRules.isText(name, { min: 2, max: 100, required: true });
    if (nameError) errors.push(`Csapat név: ${nameError}`);

    // Korosztály validáció
    const ageGroupError = validationRules.isText(age_group, { min: 2, max: 50, required: true });
    if (ageGroupError) errors.push(`Korosztály: ${ageGroupError}`);

    // Edző név validáció (opcionális)
    if (coach_name) {
        const coachError = validationRules.isText(coach_name, { min: 2, max: 100 });
        if (coachError) errors.push(`Edző név: ${coachError}`);
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

// Edzés validáció
const validateTraining = (req, res, next) => {
    const errors = [];
    const { date, time, type, team_id, duration, location } = req.body;

    // Dátum validáció
    const dateError = validationRules.isDate(date, { required: true });
    if (dateError) errors.push(`Dátum: ${dateError}`);

    // Időpont validáció
    const timeError = validationRules.isTime(time, true);
    if (timeError) errors.push(`Időpont: ${timeError}`);

    // Típus validáció
    const typeError = validationRules.isText(type, { min: 2, max: 100, required: true });
    if (typeError) errors.push(`Edzés típus: ${typeError}`);

    // Csapat ID validáció
    const teamError = validationRules.isNumber(team_id, { required: true, integer: true, min: 1 });
    if (teamError) errors.push(`Csapat: ${teamError}`);

    // Időtartam validáció (opcionális)
    if (duration) {
        const durationError = validationRules.isNumber(duration, { integer: true, min: 15, max: 300 });
        if (durationError) errors.push(`Időtartam: ${durationError}`);
    }

    // Helyszín validáció (opcionális)
    if (location) {
        const locationError = validationRules.isText(location, { max: 200 });
        if (locationError) errors.push(`Helyszín: ${locationError}`);
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

// Közlemény validáció
const validateAnnouncement = (req, res, next) => {
    const errors = [];
    const { title, content, category } = req.body;

    // Cím validáció
    const titleError = validationRules.isText(title, { min: 3, max: 200, required: true });
    if (titleError) errors.push(`Cím: ${titleError}`);

    // Tartalom validáció
    const contentError = validationRules.isText(content, { min: 10, max: 2000, required: true });
    if (contentError) errors.push(`Tartalom: ${contentError}`);

    // Kategória validáció
    const categoryError = validationRules.isText(category, { min: 2, max: 50, required: true });
    if (categoryError) errors.push(`Kategória: ${categoryError}`);

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

// Jelenlét validáció
const validateAttendance = (req, res, next) => {
    const errors = [];
    const { attendanceData } = req.body;

    if (!Array.isArray(attendanceData)) {
        return res.status(400).json({ errors: ['Jelenlét adatok tömb formátumban szükségesek'] });
    }

    attendanceData.forEach((attendance, index) => {
        const { playerId, present, late_minutes, performance_rating } = attendance;

        // Játékos ID validáció
        const playerError = validationRules.isNumber(playerId, { required: true, integer: true, min: 1 });
        if (playerError) errors.push(`Játékos ${index + 1}: ${playerError}`);

        // Jelenlét validáció
        if (present === undefined || present === null) {
            errors.push(`Játékos ${index + 1}: Jelenlét státusz kötelező`);
        }

        // Késés validáció (opcionális)
        if (late_minutes !== undefined && late_minutes !== null) {
            const lateError = validationRules.isNumber(late_minutes, { integer: true, min: 0, max: 120 });
            if (lateError) errors.push(`Játékos ${index + 1} késés: ${lateError}`);
        }

        // Teljesítmény validáció (opcionális)
        if (performance_rating !== undefined && performance_rating !== null && performance_rating !== '') {
            const performanceError = validationRules.isNumber(performance_rating, { integer: true, min: 1, max: 5 });
            if (performanceError) errors.push(`Játékos ${index + 1} teljesítmény: ${performanceError}`);
        }
    });

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

// Általános hiba kezelő middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Már kezelt hibák
    if (res.headersSent) {
        return next(err);
    }

    // Validációs hibák
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validációs hiba',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    // SQL hibák
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
            error: 'Adatbázis megszorítás megsértése',
            message: 'Az adatok ütköznek a meglévő rekordokkal'
        });
    }

    // Általános hibák
    res.status(500).json({
        error: 'Belső szerverhiba',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Váratlan hiba történt'
    });
};

module.exports = {
    validatePlayer,
    validateTeam,
    validateTraining,
    validateAnnouncement,
    validateAttendance,
    errorHandler,
    validationRules
};