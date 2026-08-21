// Audio notification for new escalations - soft bubble sound (base64 encoded WAV)
const NOTIFICATION_SOUND_B64 =
	"data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAEAAAAAP//AAD//wAA//8AAP//AQD+/wIA/f8DAP3/AwD9/wQA/P8FAPs/BgD6/wcA+f8IAPj/CQD3/woA9v8LAPb/CwD1/wwA9P8NAPT/DQDz/w4A8/8OAPL/DwDy/xAA8f8RAPH/EQDx/xIA8P8SAPD/EwDw/xMA8P8UAPD/FADw/xUA8P8VAPD/FgDw/xYA8f8WAPP/FgD0/xYA9f8WAPf/FQD5/xUA+/8UAPz/EwD+/xIAAAASAAIAEQADABAABQAPAAcADgAJAA0ACwAMAA0ACwAPAAkAEQAIABIABgAUAAUAFQADABcAAgAYAAAAGgD+/xsA/f8dAPv/HgD6/x8A+f8gAPj/IQD3/yEA9/8iAPb/IgD2/yIA9v8iAPb/IgD2/yEA9/8hAPj/IAD5/x8A+v8eAPv/HQD9/xwA/v8aAP//GQABAAAA//8XAAEAFgACABUAAwAUAAQAEwAFABIABgARAAgAEAAJAA4ACwANAAwADAAOAAsADwAKABAACAASAAcAEwAGABUABQAWAAQAGAADAAoAAgAcAAEAHQAAAB8A//8gAP7/IQD9/yIA/P8jAPs/JAD6/yQA+v8lAPn/JQD5/yUA+f8lAPn/JQD5/yUA+f8kAPr/JAD6/yMA+/8iAPz/IQD9/x8A/v8eAAAAHQACABsAAwAaAAUAGAAHABYACQAVAAsAEwANABEADwAPABEADQARAAsAEgAKABMACAATAAcAFAAFABUABAAWAAMAFwACABgAAQAZAAEAGgAAABsA//8cAP//HQD+/x0A/f8eAPz/HgD8/x4A+/8eAPs/HgD7/x0A+/8dAPv/HAD8/xwA/P8bAPz/GgD9/xkA/f8YAP7/FgD//xUAAAAAAAEAEwACABEAAwAQAAUADgAGAA0ACAALAAkACgALAAgADQAGAA4ABQAPAAMAAQABABABAAEAEQD//xIA/v8TAP3/FAD8/xQA+/8VAPr/FQD6/xUA+v8VAPr/FAD6/xQA+v8TAPr/EgD7/xEA+/8QAPz/DgD9/w0A/v8LAPz/CQAAAAgAAQAGAAIABQADAAMABQACAAYAAQAHAAA=";

let audio: HTMLAudioElement | null = null;

/**
 * Play a notification sound for new escalations.
 * Gracefully handles autoplay blocking in browsers.
 */
export function playNotificationSound(): void {
	if (typeof window === "undefined") return;

	try {
		if (!audio) {
			audio = new Audio(NOTIFICATION_SOUND_B64);
			audio.volume = 0.3;
		}

		audio.currentTime = 0;
		audio.play().catch(() => {
			// Silently fail if autoplay is blocked by browser
		});
	} catch {
		// Silently fail - audio playback is not critical
	}
}
