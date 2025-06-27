// Validációs függvények

// Alapvető validációs szabályok
export const validationRules = {
    required: (value, fieldName = 'Mező') => {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            return `${fieldName} kötelező`;
        }
        return null;
    },

    minLength: (value, min, fieldName = 'Mező') => {
        if (value && value.length < min) {
            return `${fieldName} legalább ${min} karakter hosszú legyen`;
        }
        return null;
    },

    maxLength: (value, max, fieldName = 'Mező') => {
        if (value && value.length > max) {
            return `${fieldName} legfeljebb ${max} karakter hosszú lehet`;
        }
        return null;
    },

    email: (value, fieldName = 'Email cím') => {
        if (value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return `${fieldName} formátuma nem megfelelő`;
            }
        }
        return null;
    },

    phone: (value, fieldName = 'Telefonszám') => {
        if (value) {
            const phoneRegex = /^[+]?[\d\s\-()]{8,15}$/;
            if (!phoneRegex.test(value)) {
                return `${fieldName} formátuma nem megfelelő`;
            }
        }
        return null;
    },

    age: (birthDate, minAge = 5, maxAge = 18, fieldName = 'Életkor') => {
        if (birthDate) {
            const birth = new Date(birthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }

            if (age < minAge || age > maxAge) {
                return `${fieldName} ${minAge} és ${maxAge} év között kell legyen`;
            }
        }
        return null;
    },

    futureDate: (date, fieldName = 'Dátum') => {
        if (date) {
            const selectedDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                return `${fieldName} nem lehet múltbeli`;
            }
        }
        return null;
    },

    pastDate: (date, fieldName = 'Dátum') => {
        if (date) {
            const selectedDate = new Date(date);
            const today = new Date();
            
            if (selectedDate > today) {
                return `${fieldName} nem lehet jövőbeli`;
            }
        }
        return null;
    },

    numeric: (value, fieldName = 'Szám') => {
        if (value && isNaN(value)) {
            return `${fieldName} csak szám lehet`;
        }
        return null;
    },

    range: (value, min, max, fieldName = 'Érték') => {
        if (value !== undefined && value !== null && value !== '') {
            const num = Number(value);
            if (num < min || num > max) {
                return `${fieldName} ${min} és ${max} között kell legyen`;
            }
        }
        return null;
    }
};

// Játékos validálás
export const validatePlayer = (playerData) => {
    const errors = {};

    // Név validálás
    const nameError = validationRules.required(playerData.name, 'Név') ||
                     validationRules.minLength(playerData.name, 2, 'Név') ||
                     validationRules.maxLength(playerData.name, 100, 'Név');
    if (nameError) errors.name = nameError;

    // Születési dátum validálás
    const birthDateError = validationRules.required(playerData.birth_date, 'Születési dátum') ||
                          validationRules.pastDate(playerData.birth_date, 'Születési dátum') ||
                          validationRules.age(playerData.birth_date);
    if (birthDateError) errors.birth_date = birthDateError;

    // Szülő email validálás (opcionális)
    if (playerData.parent_email) {
        const emailError = validationRules.email(playerData.parent_email, 'Szülő email címe');
        if (emailError) errors.parent_email = emailError;
    }

    // Szülő telefon validálás (opcionális)
    if (playerData.parent_phone) {
        const phoneError = validationRules.phone(playerData.parent_phone, 'Szülő telefonszáma');
        if (phoneError) errors.parent_phone = phoneError;
    }

    // Szülő név validálás (ha telefon vagy email van megadva)
    if ((playerData.parent_phone || playerData.parent_email) && !playerData.parent_name) {
        errors.parent_name = 'Szülő neve kötelező, ha elérhetőség van megadva';
    }

    // Pozíció validálás (opcionális, de ha van, akkor valid értéknek kell lennie)
    const validPositions = ['kapus', 'védő', 'középpályás', 'támadó'];
    if (playerData.position && !validPositions.includes(playerData.position)) {
        errors.position = 'Érvénytelen pozíció';
    }

    // Domináns láb validálás (opcionális, de ha van, akkor valid értéknek kell lennie)
    const validFeet = ['jobb', 'bal', 'mindkettő'];
    if (playerData.dominant_foot && !validFeet.includes(playerData.dominant_foot)) {
        errors.dominant_foot = 'Érvénytelen domináns láb';
    }

    return errors;
};

// Csapat validálás
export const validateTeam = (teamData) => {
    const errors = {};

    // Név validálás
    const nameError = validationRules.required(teamData.name, 'Csapat név') ||
                     validationRules.minLength(teamData.name, 2, 'Csapat név') ||
                     validationRules.maxLength(teamData.name, 100, 'Csapat név');
    if (nameError) errors.name = nameError;

    // Korosztály validálás
    const ageGroupError = validationRules.required(teamData.age_group, 'Korosztály');
    if (ageGroupError) errors.age_group = ageGroupError;

    // Edző név validálás (opcionális)
    if (teamData.coach_name) {
        const coachError = validationRules.minLength(teamData.coach_name, 2, 'Edző neve') ||
                          validationRules.maxLength(teamData.coach_name, 100, 'Edző neve');
        if (coachError) errors.coach_name = coachError;
    }

    return errors;
};

// Edzés validálás
export const validateTraining = (trainingData) => {
    const errors = {};

    // Dátum validálás
    const dateError = validationRules.required(trainingData.date, 'Dátum');
    if (dateError) errors.date = dateError;

    // Időpont validálás
    const timeError = validationRules.required(trainingData.time, 'Időpont');
    if (timeError) errors.time = timeError;

    // Típus validálás
    const typeError = validationRules.required(trainingData.type, 'Edzés típusa') ||
                     validationRules.maxLength(trainingData.type, 100, 'Edzés típusa');
    if (typeError) errors.type = typeError;

    // Csapat validálás
    const teamError = validationRules.required(trainingData.team_id, 'Csapat');
    if (teamError) errors.team_id = teamError;

    // Időtartam validálás (opcionális)
    if (trainingData.duration) {
        const durationError = validationRules.numeric(trainingData.duration, 'Időtartam') ||
                             validationRules.range(trainingData.duration, 15, 300, 'Időtartam');
        if (durationError) errors.duration = durationError;
    }

    // Helyszín validálás (opcionális)
    if (trainingData.location) {
        const locationError = validationRules.maxLength(trainingData.location, 200, 'Helyszín');
        if (locationError) errors.location = locationError;
    }

    return errors;
};

// Közlemény validálás
export const validateAnnouncement = (announcementData) => {
    const errors = {};

    // Cím validálás
    const titleError = validationRules.required(announcementData.title, 'Cím') ||
                      validationRules.minLength(announcementData.title, 3, 'Cím') ||
                      validationRules.maxLength(announcementData.title, 200, 'Cím');
    if (titleError) errors.title = titleError;

    // Tartalom validálás
    const contentError = validationRules.required(announcementData.content, 'Tartalom') ||
                        validationRules.minLength(announcementData.content, 10, 'Tartalom') ||
                        validationRules.maxLength(announcementData.content, 2000, 'Tartalom');
    if (contentError) errors.content = contentError;

    // Kategória validálás
    const categoryError = validationRules.required(announcementData.category, 'Kategória');
    if (categoryError) errors.category = categoryError;

    return errors;
};

// Jelenlét validálás
export const validateAttendance = (attendanceData) => {
    const errors = {};

    // Játékos ID validálás
    const playerError = validationRules.required(attendanceData.player_id, 'Játékos');
    if (playerError) errors.player_id = playerError;

    // Edzés ID validálás
    const trainingError = validationRules.required(attendanceData.training_id, 'Edzés');
    if (trainingError) errors.training_id = trainingError;

    // Késés validálás (opcionális)
    if (attendanceData.late_minutes) {
        const lateError = validationRules.numeric(attendanceData.late_minutes, 'Késés') ||
                         validationRules.range(attendanceData.late_minutes, 0, 120, 'Késés');
        if (lateError) errors.late_minutes = lateError;
    }

    // Teljesítmény validálás (opcionális)
    if (attendanceData.performance_rating) {
        const performanceError = validationRules.numeric(attendanceData.performance_rating, 'Teljesítmény') ||
                               validationRules.range(attendanceData.performance_rating, 1, 5, 'Teljesítmény');
        if (performanceError) errors.performance_rating = performanceError;
    }

    // Hiányzás ok validálás (ha nincs jelen)
    if (!attendanceData.present && !attendanceData.absence_reason) {
        errors.absence_reason = 'Hiányzás esetén az ok megadása kötelező';
    }

    return errors;
};

// Általános validátor wrapper
export const validate = (data, validatorFunction) => {
    const errors = validatorFunction(data);
    const isValid = Object.keys(errors).length === 0;
    
    return {
        isValid,
        errors,
        hasError: (field) => !!errors[field],
        getError: (field) => errors[field] || null,
        getErrorCount: () => Object.keys(errors).length
    };
};

// Valós idejű validálás hook-hoz
export const validateField = (value, fieldName, rules = []) => {
    for (const rule of rules) {
        const error = rule(value, fieldName);
        if (error) return error;
    }
    return null;
};