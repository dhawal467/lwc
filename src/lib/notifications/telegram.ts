/**
 * Telegram Bot API Client
 *
 * Thin wrapper around the Telegram Bot API using plain fetch().
 * Supports sendMessage (text) and sendPhoto (image + caption).
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

export function getConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Telegram] Bot token or chat ID not configured. Skipping notifications.');
    return null;
  }

  return { token, chatId };
}

export interface TelegramSendResult {
  ok: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Send a text-only message to the configured Telegram group.
 */
export async function sendTextMessage(
  text: string,
  parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
): Promise<TelegramSendResult> {
  const config = getConfig();
  if (!config) return { ok: false, error: 'Telegram not configured' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(`${TELEGRAM_API}${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!data.ok) {
      return { ok: false, error: data.description || 'Unknown Telegram API error' };
    }

    return { ok: true, messageId: data.result?.message_id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Send a photo message with caption to the configured Telegram group.
 * Falls back to text-only if the photo URL is invalid or fails.
 */
export async function sendPhotoMessage(
  photoUrl: string,
  caption: string,
  parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
): Promise<TelegramSendResult> {
  const config = getConfig();
  if (!config) return { ok: false, error: 'Telegram not configured' };

  // Telegram captions are limited to 1024 characters
  const trimmedCaption = caption.length > 1024 ? caption.slice(0, 1021) + '...' : caption;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(`${TELEGRAM_API}${config.token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        photo: photoUrl,
        caption: trimmedCaption,
        parse_mode: parseMode,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!data.ok) {
      console.warn(`[Telegram] sendPhoto failed (${data.description}), falling back to text`);
      return sendTextMessage(caption, parseMode);
    }

    return { ok: true, messageId: data.result?.message_id };
  } catch (err: unknown) {
    console.warn('[Telegram] sendPhoto error, falling back to text:', err);
    return sendTextMessage(caption, parseMode);
  } finally {
    clearTimeout(timeout);
  }
}
