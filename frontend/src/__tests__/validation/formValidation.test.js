import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateRequired,
  validateLength,
  validateUserRegistration,
  validatePlayerData,
  validateTrainingData,
  validateMatchData
} from '../../utils/validation';

describe('Form Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'firstname+lastname@company.org',
        'test123@test-domain.com',
        'user@subdomain.domain.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBeNull();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user name@domain.com',
        '',
        null,
        undefined
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe('Invalid email format');
      });
    });

    it('should handle edge cases', () => {
      expect(validateEmail('a@b.c')).toBeNull(); // Minimum valid email
      expect(validateEmail('user@domain-with-hyphen.com')).toBeNull();
      expect(validateEmail('user+tag@domain.com')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MySecure@Pass1',
        'Complex#Pass2023',
        'Strong$Pass456'
      ];

      strongPasswords.forEach(password => {
        expect(validatePassword(password)).toBeNull();
      });
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('123')).toBe('Password must be at least 6 characters long');
      expect(validatePassword('password')).toBe('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      expect(validatePassword('PASSWORD123')).toBe('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      expect(validatePassword('Password')).toBe('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    });

    it('should handle empty passwords', () => {
      expect(validatePassword('')).toBe('Password must be at least 6 characters long');
      expect(validatePassword(null)).toBe('Password must be at least 6 characters long');
      expect(validatePassword(undefined)).toBe('Password must be at least 6 characters long');
    });

    it('should validate minimum length requirement', () => {
      expect(validatePassword('Aa1!', { minLength: 8 })).toBe('Password must be at least 8 characters long');
      expect(validatePassword('Password1!', { minLength: 8 })).toBeNull();
    });

    it('should respect custom requirements', () => {
      const options = {
        requireSpecialChar: true,
        requireUppercase: false,
        requireNumber: false
      };

      expect(validatePassword('password!', options)).toBeNull();
      expect(validatePassword('password', options)).toBe('Password must contain at least one special character');
    });
  });

  describe('validateName', () => {
    it('should validate proper names', () => {
      const validNames = [
        'John Doe',
        'Mary Jane',
        'José María',
        'Anne-Marie',
        'O\'Connor',
        'Jean-Baptiste'
      ];

      validNames.forEach(name => {
        expect(validateName(name)).toBeNull();
      });
    });

    it('should reject invalid names', () => {
      expect(validateName('J')).toBe('Name must be at least 2 characters long');
      expect(validateName('12345')).toBe('Name must contain only letters, spaces, hyphens, and apostrophes');
      expect(validateName('John@Doe')).toBe('Name must contain only letters, spaces, hyphens, and apostrophes');
      expect(validateName('')).toBe('Name is required');
    });

    it('should handle special characters in names', () => {
      expect(validateName('José')).toBeNull();
      expect(validateName('François')).toBeNull();
      expect(validateName('Müller')).toBeNull();
    });
  });

  describe('validatePhone', () => {
    it('should validate various phone number formats', () => {
      const validPhones = [
        '+1234567890',
        '(555) 123-4567',
        '555-123-4567',
        '555.123.4567',
        '5551234567',
        '+36 30 123 4567'
      ];

      validPhones.forEach(phone => {
        expect(validatePhone(phone)).toBeNull();
      });
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe('Phone number must be at least 10 digits');
      expect(validatePhone('abc-def-ghij')).toBe('Phone number must contain at least 10 digits');
      expect(validatePhone('')).toBe('Phone number is required');
    });

    it('should handle international formats', () => {
      expect(validatePhone('+44 20 7946 0958')).toBeNull();
      expect(validatePhone('+86 138 0013 8000')).toBeNull();
    });
  });

  describe('validateRequired', () => {
    it('should validate required fields', () => {
      expect(validateRequired('some value')).toBeNull();
      expect(validateRequired('   value   ')).toBeNull(); // Should trim
      expect(validateRequired(0)).toBeNull(); // Zero is valid
      expect(validateRequired(false)).toBeNull(); // False is valid
    });

    it('should reject empty values', () => {
      expect(validateRequired('')).toBe('This field is required');
      expect(validateRequired('   ')).toBe('This field is required');
      expect(validateRequired(null)).toBe('This field is required');
      expect(validateRequired(undefined)).toBe('This field is required');
    });

    it('should use custom message', () => {
      expect(validateRequired('', 'Name is required')).toBe('Name is required');
    });
  });

  describe('validateLength', () => {
    it('should validate length constraints', () => {
      expect(validateLength('hello', { min: 3, max: 10 })).toBeNull();
      expect(validateLength('test', { min: 4, max: 4 })).toBeNull();
    });

    it('should reject values outside length constraints', () => {
      expect(validateLength('hi', { min: 3 })).toBe('Must be at least 3 characters long');
      expect(validateLength('toolongvalue', { max: 5 })).toBe('Must be no more than 5 characters long');
      expect(validateLength('test', { min: 5, max: 10 })).toBe('Must be at least 5 characters long');
    });

    it('should handle exact length validation', () => {
      expect(validateLength('1234', { exact: 4 })).toBeNull();
      expect(validateLength('123', { exact: 4 })).toBe('Must be exactly 4 characters long');
      expect(validateLength('12345', { exact: 4 })).toBe('Must be exactly 4 characters long');
    });
  });

  describe('validateUserRegistration', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'player'
    };

    it('should validate complete user registration data', () => {
      const result = validateUserRegistration(validUserData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should detect missing required fields', () => {
      const incompleteData = {
        name: 'John Doe',
        email: 'john@example.com'
        // password and role missing
      };

      const result = validateUserRegistration(incompleteData);
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Password is required');
      expect(result.errors.role).toBe('Role is required');
    });

    it('should validate password confirmation match', () => {
      const mismatchData = {
        ...validUserData,
        confirmPassword: 'DifferentPassword123!'
      };

      const result = validateUserRegistration(mismatchData);
      expect(result.isValid).toBe(false);
      expect(result.errors.confirmPassword).toBe('Passwords do not match');
    });

    it('should validate email format in registration', () => {
      const invalidEmailData = {
        ...validUserData,
        email: 'invalid-email'
      };

      const result = validateUserRegistration(invalidEmailData);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Invalid email format');
    });

    it('should validate role selection', () => {
      const invalidRoleData = {
        ...validUserData,
        role: 'invalid-role'
      };

      const result = validateUserRegistration(invalidRoleData);
      expect(result.isValid).toBe(false);
      expect(result.errors.role).toBe('Invalid role selected');
    });
  });

  describe('validatePlayerData', () => {
    const validPlayerData = {
      name: 'John Player',
      email: 'player@example.com',
      position: 'forward',
      jerseyNumber: 10,
      dateOfBirth: '2005-01-15'
    };

    it('should validate complete player data', () => {
      const result = validatePlayerData(validPlayerData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should validate position field', () => {
      const invalidPositionData = {
        ...validPlayerData,
        position: 'invalid-position'
      };

      const result = validatePlayerData(invalidPositionData);
      expect(result.isValid).toBe(false);
      expect(result.errors.position).toBe('Invalid position selected');
    });

    it('should validate jersey number uniqueness', () => {
      const invalidJerseyData = {
        ...validPlayerData,
        jerseyNumber: 'not-a-number'
      };

      const result = validatePlayerData(invalidJerseyData);
      expect(result.isValid).toBe(false);
      expect(result.errors.jerseyNumber).toBe('Jersey number must be a valid number');
    });

    it('should validate date of birth', () => {
      const invalidDateData = {
        ...validPlayerData,
        dateOfBirth: '2025-01-01' // Future date
      };

      const result = validatePlayerData(invalidDateData);
      expect(result.isValid).toBe(false);
      expect(result.errors.dateOfBirth).toBe('Date of birth cannot be in the future');
    });

    it('should validate minimum age requirement', () => {
      const tooYoungData = {
        ...validPlayerData,
        dateOfBirth: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * 3).toISOString().split('T')[0] // 3 years old
      };

      const result = validatePlayerData(tooYoungData);
      expect(result.isValid).toBe(false);
      expect(result.errors.dateOfBirth).toBe('Player must be at least 5 years old');
    });
  });

  describe('validateTrainingData', () => {
    const validTrainingData = {
      title: 'Passing Practice',
      description: 'Focus on short and long passes',
      date: '2024-02-15',
      time: '10:00',
      duration: 90,
      teamId: 1
    };

    it('should validate complete training data', () => {
      const result = validateTrainingData(validTrainingData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should validate required fields', () => {
      const incompleteData = {
        title: 'Training',
        date: '2024-02-15'
        // time, teamId missing
      };

      const result = validateTrainingData(incompleteData);
      expect(result.isValid).toBe(false);
      expect(result.errors.time).toBe('Time is required');
      expect(result.errors.teamId).toBe('Team selection is required');
    });

    it('should validate training date is not in the past', () => {
      const pastDateData = {
        ...validTrainingData,
        date: '2020-01-01'
      };

      const result = validateTrainingData(pastDateData);
      expect(result.isValid).toBe(false);
      expect(result.errors.date).toBe('Training date cannot be in the past');
    });

    it('should validate duration constraints', () => {
      const invalidDurationData = {
        ...validTrainingData,
        duration: 300 // 5 hours
      };

      const result = validateTrainingData(invalidDurationData);
      expect(result.isValid).toBe(false);
      expect(result.errors.duration).toBe('Duration must be between 30 and 180 minutes');
    });

    it('should validate title length', () => {
      const longTitleData = {
        ...validTrainingData,
        title: 'A'.repeat(101) // Too long
      };

      const result = validateTrainingData(longTitleData);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('Title must be no more than 100 characters long');
    });
  });

  describe('validateMatchData', () => {
    const validMatchData = {
      homeTeamId: 1,
      awayTeamId: 2,
      date: '2024-02-20',
      time: '15:00',
      venue: 'Home Stadium',
      type: 'league'
    };

    it('should validate complete match data', () => {
      const result = validateMatchData(validMatchData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should prevent team playing against itself', () => {
      const sameTeamData = {
        ...validMatchData,
        homeTeamId: 1,
        awayTeamId: 1
      };

      const result = validateMatchData(sameTeamData);
      expect(result.isValid).toBe(false);
      expect(result.errors.awayTeamId).toBe('Away team must be different from home team');
    });

    it('should validate match type', () => {
      const invalidTypeData = {
        ...validMatchData,
        type: 'invalid-type'
      };

      const result = validateMatchData(invalidTypeData);
      expect(result.isValid).toBe(false);
      expect(result.errors.type).toBe('Invalid match type selected');
    });

    it('should validate venue is provided', () => {
      const noVenueData = {
        ...validMatchData,
        venue: ''
      };

      const result = validateMatchData(noVenueData);
      expect(result.isValid).toBe(false);
      expect(result.errors.venue).toBe('Venue is required');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex validation scenarios', () => {
      const complexUserData = {
        name: 'José María O\'Connor-Smith',
        email: 'jose.maria@example-domain.co.uk',
        password: 'SecurePass123!@#',
        confirmPassword: 'SecurePass123!@#',
        role: 'coach',
        phone: '+36 30 123 4567'
      };

      const result = validateUserRegistration(complexUserData);
      expect(result.isValid).toBe(true);
    });

    it('should accumulate multiple validation errors', () => {
      const invalidData = {
        name: 'J',
        email: 'invalid-email',
        password: '123',
        confirmPassword: '456',
        role: 'invalid-role'
      };

      const result = validateUserRegistration(invalidData);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(5);
      expect(result.errors.name).toContain('at least 2 characters');
      expect(result.errors.email).toBe('Invalid email format');
      expect(result.errors.password).toContain('at least 6 characters');
      expect(result.errors.confirmPassword).toBe('Passwords do not match');
      expect(result.errors.role).toBe('Invalid role selected');
    });
  });
});