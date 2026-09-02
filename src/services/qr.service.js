const QRCode = require('qrcode');
const { LinkUtils } = require('./linkUtilities');

/**
 * Service for generating QR codes (PNG binary buffers and Data URLs)
 */
class QrService {
  /**
   * Generates a PNG Buffer for any text or URL string.
   * @param {string} text - URL or text to encode
   * @param {Object} options - Customization options (width, margin, color)
   * @returns {Promise<Buffer>}
   */
  static async generatePngBuffer(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Valid text or URL is required for QR code generation');
    }

    const qrOptions = {
      type: 'png',
      width: parseInt(options.width || options.size, 10) || 320,
      margin: options.margin !== undefined ? parseInt(options.margin, 10) : 2,
      color: {
        dark: options.dark || '#1E1B4B', // Catch Me dark indigo/slate
        light: options.light || '#FFFFFF',
      },
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    };

    return await QRCode.toBuffer(text, qrOptions);
  }

  /**
   * Generates a Base64 Data URL (image/png) for direct embedding into HTML or PDFMake.
   * @param {string} text - URL or text to encode
   * @param {Object} options - Customization options
   * @returns {Promise<string>}
   */
  static async generateDataUrl(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Valid text or URL is required for QR code generation');
    }

    const qrOptions = {
      width: parseInt(options.width || options.size, 10) || 300,
      margin: options.margin !== undefined ? parseInt(options.margin, 10) : 1,
      color: {
        dark: options.dark || '#1E1B4B',
        light: options.light || '#FFFFFF',
      },
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    };

    return await QRCode.toDataURL(text, qrOptions);
  }

  /**
   * Generates a link and QR code for a specific Catch Me entity.
   * @param {'profile'|'game'|'lineup'|'stats'|'post'|'challenge'} type 
   * @param {string} id 
   * @param {Object} options 
   * @returns {Promise<{ link: string, buffer: Buffer, dataUrl: string }>}
   */
  static async generateEntityQr(type, id, options = {}) {
    let link = '';
    switch ((type || '').toLowerCase()) {
      case 'profile':
      case 'user':
      case 'athlete':
        link = LinkUtils.generateProfileLink(id);
        break;
      case 'game':
        link = LinkUtils.generateGameLink(id);
        break;
      case 'lineup':
        link = LinkUtils.generateLineupLink(id);
        break;
      case 'stats':
        link = LinkUtils.generateStatsLink(id);
        break;
      case 'post':
        link = LinkUtils.generatePostLink(id);
        break;
      case 'challenge':
      case 'event':
        link = LinkUtils.generateChallengeLink(id);
        break;
      default:
        throw new Error(`Unsupported entity type: ${type}`);
    }

    const buffer = await this.generatePngBuffer(link, options);
    const dataUrl = await this.generateDataUrl(link, options);

    return { link, buffer, dataUrl };
  }
}

module.exports = { QrService };
