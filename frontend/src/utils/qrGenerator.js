import QRCode from 'qrcode';
import jsPDF from 'jspdf';

/**
 * QR Code generation and management utilities
 * Handles QR code creation, validation, and export functionality
 */

// QR Code types
export const QR_CODE_TYPES = {
    ATTENDANCE: 'attendance',
    TRAINING: 'training',
    MATCH: 'match',
    EVENT: 'event',
    PLAYER_ID: 'player_id'
};

// QR Code formats
export const QR_FORMATS = {
    PNG: 'png',
    SVG: 'svg',
    PDF: 'pdf'
};

/**
 * Generate QR code data string
 */
export const generateQRData = (playerId, sessionId, sessionType, timestamp, signature) => {
    const qrData = {
        playerId,
        sessionId,
        sessionType,
        timestamp: timestamp || Date.now(),
        signature,
        version: '1.0'
    };
    
    return JSON.stringify(qrData);
};

/**
 * Parse QR code data
 */
export const parseQRData = (qrString) => {
    try {
        const data = JSON.parse(qrString);
        
        // Validate required fields
        if (!data.playerId || !data.sessionId || !data.sessionType) {
            throw new Error('Invalid QR code format - missing required fields');
        }
        
        return {
            isValid: true,
            data,
            error: null
        };
    } catch (error) {
        return {
            isValid: false,
            data: null,
            error: error.message
        };
    }
};

/**
 * Generate QR code as data URL (base64)
 */
export const generateQRCodeDataURL = async (data, options = {}) => {
    const defaultOptions = {
        type: 'image/png',
        quality: 0.92,
        margin: 2,
        color: {
            dark: '#2c5530',  // Lion Football Academy dark green
            light: '#FFFFFF'
        },
        width: 256,
        ...options
    };

    try {
        const qrDataURL = await QRCode.toDataURL(data, defaultOptions);
        return {
            success: true,
            dataURL: qrDataURL,
            error: null
        };
    } catch (error) {
        return {
            success: false,
            dataURL: null,
            error: error.message
        };
    }
};

/**
 * Generate QR code as SVG string
 */
export const generateQRCodeSVG = async (data, options = {}) => {
    const defaultOptions = {
        type: 'svg',
        margin: 2,
        color: {
            dark: '#2c5530',
            light: '#FFFFFF'
        },
        width: 256,
        ...options
    };

    try {
        const svgString = await QRCode.toString(data, defaultOptions);
        return {
            success: true,
            svg: svgString,
            error: null
        };
    } catch (error) {
        return {
            success: false,
            svg: null,
            error: error.message
        };
    }
};

/**
 * Download QR code as image file
 */
export const downloadQRCodeImage = async (data, filename = 'qr-code', format = 'png') => {
    try {
        const result = await generateQRCodeDataURL(data, {
            width: 512,
            type: `image/${format}`
        });

        if (!result.success) {
            throw new Error(result.error);
        }

        // Create download link
        const link = document.createElement('a');
        link.href = result.dataURL;
        link.download = `${filename}.${format}`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Generate and download QR code as PDF
 */
export const downloadQRCodePDF = async (data, playerInfo, sessionInfo) => {
    try {
        const result = await generateQRCodeDataURL(data, {
            width: 300,
            type: 'image/png'
        });

        if (!result.success) {
            throw new Error(result.error);
        }

        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Header
        pdf.setFontSize(20);
        pdf.setTextColor(44, 85, 48); // Lion Football Academy green
        pdf.text('Lion Football Academy', pageWidth / 2, 30, { align: 'center' });
        
        pdf.setFontSize(16);
        pdf.text('Player Attendance QR Code', pageWidth / 2, 45, { align: 'center' });

        // Player info
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        const playerY = 70;
        pdf.text(`Player: ${playerInfo.name}`, 20, playerY);
        pdf.text(`Team: ${playerInfo.team}`, 20, playerY + 10);
        pdf.text(`Player ID: ${playerInfo.id}`, 20, playerY + 20);
        
        if (sessionInfo) {
            pdf.text(`Session: ${sessionInfo.name}`, 20, playerY + 30);
            pdf.text(`Date: ${sessionInfo.date}`, 20, playerY + 40);
            pdf.text(`Type: ${sessionInfo.type}`, 20, playerY + 50);
        }

        // QR Code
        const qrSize = 80;
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = sessionInfo ? 130 : 110;
        
        pdf.addImage(result.dataURL, 'PNG', qrX, qrY, qrSize, qrSize);

        // Instructions
        const instructionsY = qrY + qrSize + 20;
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        
        const instructions = [
            'Instructions for Use:',
            '1. Show this QR code to your coach during attendance check',
            '2. Ensure the QR code is clearly visible and not damaged',
            '3. Do not share this QR code with other players',
            '4. Report any issues to your coach immediately',
            '',
            'This QR code is unique to you and should not be copied or shared.'
        ];

        instructions.forEach((line, index) => {
            const weight = index === 0 ? 'bold' : 'normal';
            pdf.setFont('helvetica', weight);
            pdf.text(line, 20, instructionsY + (index * 6));
        });

        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, pageHeight - 20);
        pdf.text('Lion Football Academy - Building Champions On and Off the Field', pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Download
        const filename = `QR_${playerInfo.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        pdf.save(filename);

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Validate QR code timestamp (check if not expired)
 */
export const validateQRTimestamp = (timestamp, expirationMinutes = 30) => {
    const now = Date.now();
    const qrTime = parseInt(timestamp);
    const expirationTime = qrTime + (expirationMinutes * 60 * 1000);
    
    return {
        isValid: now <= expirationTime,
        expiresAt: new Date(expirationTime),
        remainingTime: Math.max(0, expirationTime - now)
    };
};

/**
 * Generate secure signature for QR code (client-side validation helper)
 */
export const generateQRSignature = (playerId, sessionId, timestamp, secretKey) => {
    // Simple hash generation for client-side validation
    // Note: Real signature validation should be done server-side
    const dataString = `${playerId}-${sessionId}-${timestamp}`;
    let hash = 0;
    
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36);
};

/**
 * Get QR code display size based on container
 */
export const calculateQRSize = (containerWidth, maxSize = 300, minSize = 150) => {
    const calculatedSize = Math.min(containerWidth * 0.8, maxSize);
    return Math.max(calculatedSize, minSize);
};

/**
 * Format QR code for different session types
 */
export const formatSessionQRCode = async (player, session, signature) => {
    const qrData = generateQRData(
        player.id,
        session.id,
        session.type,
        Date.now(),
        signature
    );

    const result = await generateQRCodeDataURL(qrData);
    
    if (result.success) {
        return {
            ...result,
            qrData,
            displayInfo: {
                playerName: `${player.first_name} ${player.last_name}`,
                sessionName: session.name || `${session.type} Session`,
                sessionDate: new Date(session.date).toLocaleDateString(),
                sessionType: session.type,
                teamName: player.team_name || 'Unknown Team'
            }
        };
    }
    
    return result;
};

/**
 * Generate player identification QR code (permanent)
 */
export const generatePlayerIDQR = async (player) => {
    const qrData = generateQRData(
        player.id,
        'player-id',
        QR_CODE_TYPES.PLAYER_ID,
        Date.now(),
        'permanent'
    );

    const result = await generateQRCodeDataURL(qrData, {
        width: 256,
        color: {
            dark: '#8B5A3C', // Lion Football Academy brown
            light: '#FFFFFF'
        }
    });

    return {
        ...result,
        qrData,
        playerInfo: {
            name: `${player.first_name} ${player.last_name}`,
            id: player.id,
            team: player.team_name || 'No Team Assigned',
            role: player.role || 'Player'
        }
    };
};

/**
 * Batch generate QR codes for multiple players
 */
export const batchGenerateQRCodes = async (players, session, getSignature) => {
    const results = [];
    
    for (const player of players) {
        try {
            const signature = await getSignature(player.id, session.id);
            const qrResult = await formatSessionQRCode(player, session, signature);
            
            results.push({
                playerId: player.id,
                playerName: `${player.first_name} ${player.last_name}`,
                success: qrResult.success,
                qrCode: qrResult.success ? qrResult.dataURL : null,
                error: qrResult.error
            });
        } catch (error) {
            results.push({
                playerId: player.id,
                playerName: `${player.first_name} ${player.last_name}`,
                success: false,
                qrCode: null,
                error: error.message
            });
        }
    }
    
    return results;
};

/**
 * QR Code scanner result validation
 */
export const validateScanResult = (scanResult, expectedSessionId = null) => {
    const parseResult = parseQRData(scanResult);
    
    if (!parseResult.isValid) {
        return {
            isValid: false,
            error: parseResult.error,
            data: null
        };
    }

    const { data } = parseResult;
    
    // Check timestamp validity
    const timestampValidation = validateQRTimestamp(data.timestamp);
    if (!timestampValidation.isValid) {
        return {
            isValid: false,
            error: 'QR code has expired. Please generate a new one.',
            data: null
        };
    }

    // Check session match if provided
    if (expectedSessionId && data.sessionId !== expectedSessionId) {
        return {
            isValid: false,
            error: 'QR code is not valid for this session.',
            data: null
        };
    }

    return {
        isValid: true,
        error: null,
        data: {
            ...data,
            expiresAt: timestampValidation.expiresAt,
            remainingTime: timestampValidation.remainingTime
        }
    };
};

export default {
    QR_CODE_TYPES,
    QR_FORMATS,
    generateQRData,
    parseQRData,
    generateQRCodeDataURL,
    generateQRCodeSVG,
    downloadQRCodeImage,
    downloadQRCodePDF,
    validateQRTimestamp,
    generateQRSignature,
    calculateQRSize,
    formatSessionQRCode,
    generatePlayerIDQR,
    batchGenerateQRCodes,
    validateScanResult
};