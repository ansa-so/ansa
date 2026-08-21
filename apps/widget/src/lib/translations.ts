/**
 * Widget System Translations
 *
 * This file contains all user-facing strings used in the widget.
 * Translations are organized by category and support 26+ languages.
 *
 * To add a new string:
 * 1. Add the key to TranslationStrings interface
 * 2. Add the English value to the 'en' translations
 * 3. Add translations for other languages
 *
 * To add a new language:
 * 1. Add the language code to the translations object
 * 2. Copy the 'en' object and translate all values
 */

export interface TranslationStrings {
	header: {
		alwaysOnline: string;
		humanAgentConnected: string;
	};
	buttons: {
		collapse: string;
		expand: string;
		copy: string;
		helpful: string;
		notHelpful: string;
		chatWithUs: string;
	};
	menu: {
		startNewChat: string;
		endChat: string;
		viewRecentChats: string;
	};
	chat: {
		thinking: string;
		seen: string;
		supportAgent: string;
		automated: string;
		conversationResolved: string;
		rateLimitReached: string;
		startNewChat: string;
		resolutionMessage: string;
		escalationConfirmation: string;
	};
	endChat: {
		title: string;
		description: string;
		rateQuality: string;
		required: string;
		bad: string;
		okay: string;
		good: string;
		great: string;
		additionalFeedback: string;
		feedbackPlaceholder: string;
		submitReview: string;
		startNewChat: string;
	};
	home: {
		online: string;
		humanAgents: string;
		available: string;
		suggestedActions: string;
	};
	recentChats: {
		title: string;
		empty: string;
		messages: string;
		resolved: string;
		open: string;
	};
	errors: {
		somethingWentWrong: string;
		formTimeout: string;
		clientHandlerFailed: string;
		formSubmissionFailed: string;
		brandingRequired: string;
		offlineQueue: string;
		messageFailed: string;
		tapToRetry: string;
	};
	connection: {
		reconnect: string;
		disconnectedTap: string;
	};
	forms: {
		formSubmitted: string;
		customerSatisfactionSurvey: string;
		satisfactionIntro: string;
		satisfactionDescription: string;
		satisfactionQuestion: string;
		verySatisfied: string;
		satisfied: string;
		neutral: string;
		dissatisfied: string;
		veryDissatisfied: string;
		additionalFeedbackOptional: string;
		// Form block strings
		loadingForm: string;
		submitting: string;
		submitDetails: string;
		formSubmittedSuccessfully: string;
		cancel: string;
		// Default contact form
		name: string;
		yourName: string;
		nameRequired: string;
		email: string;
		emailPlaceholder: string;
		emailRequired: string;
		message: string;
		howCanWeHelp: string;
		messageRequired: string;
		sendMessage: string;
		thanksWellGetBack: string;
		somethingWentWrongTryAgain: string;
	};
	escalation: {
		positiveFeedback: string;
		requestHuman: string;
	};
	time: {
		justNow: string;
		minutesAgo: string;
		hoursAgo: string;
		yesterday: string;
		daysAgo: string;
		weeksAgo: string;
		monthsAgo: string;
	};
	misc: {
		poweredByAnsa: string;
	};
	triggers: {
		greeting: string;
		startConversation: string;
	};
}

const translations: Record<string, TranslationStrings> = {
	en: {
		header: {
			alwaysOnline: "Always online",
			humanAgentConnected: "Human Agent Connected",
		},
		buttons: {
			collapse: "Collapse",
			expand: "Expand",
			copy: "Copy message",
			helpful: "Good response",
			notHelpful: "Bad response",
			chatWithUs: "Chat with us",
		},
		menu: {
			startNewChat: "Start a new chat",
			endChat: "End chat",
			viewRecentChats: "View recent chats",
		},
		chat: {
			thinking: "Thinking",
			seen: "Seen",
			supportAgent: "Support Agent",
			automated: "Automated",
			conversationResolved: "Conversation Resolved",
			rateLimitReached: "Message Limit Reached",
			startNewChat: "Start a New Chat",
			resolutionMessage:
				"This conversation has been resolved by our support team. Thank you for contacting us!",
			escalationConfirmation:
				"Your request has been forwarded to our human support team. They will respond soon.",
		},
		endChat: {
			title: "Chat Ended",
			description:
				"Thank you for chatting with us. A transcript of this session has been saved to your history.",
			rateQuality: "Rate Quality",
			required: "Required",
			bad: "Bad",
			okay: "Okay",
			good: "Good",
			great: "Great",
			additionalFeedback: "Additional Feedback",
			feedbackPlaceholder: "Tell us more about your experience...",
			submitReview: "Submit Review",
			startNewChat: "Start New Chat",
		},
		home: {
			online: "Online",
			humanAgents: "Human Agents:",
			available: "Available",
			suggestedActions: "Suggested Actions",
		},
		recentChats: {
			title: "Recent Chats",
			empty: "No recent chats",
			messages: "messages",
			resolved: "Resolved",
			open: "Open",
		},
		errors: {
			somethingWentWrong: "Sorry, something went wrong. Please try again.",
			formTimeout: "Form handler timeout",
			clientHandlerFailed: "Client handler failed",
			formSubmissionFailed: "Failed to submit form",
			brandingRequired: "This chat requires Ansa branding to be displayed.",
			offlineQueue: "pending. Will send when reconnected.",
			messageFailed: "Failed to send",
			tapToRetry: "Tap to retry",
		},
		connection: {
			reconnect: "Reconnect",
			disconnectedTap: "Disconnected. Tap to reconnect.",
		},
		forms: {
			formSubmitted: "Form submitted:",
			customerSatisfactionSurvey: "Customer Satisfaction Survey",
			satisfactionIntro: "Thank you for contacting us! We'd love to hear about your experience.",
			satisfactionDescription: "Help us improve our service",
			satisfactionQuestion: "How satisfied are you with the resolution?",
			verySatisfied: "⭐⭐⭐⭐⭐ Very Satisfied",
			satisfied: "⭐⭐⭐⭐ Satisfied",
			neutral: "⭐⭐⭐ Neutral",
			dissatisfied: "⭐⭐ Dissatisfied",
			veryDissatisfied: "⭐ Very Dissatisfied",
			additionalFeedbackOptional: "Any additional feedback? (optional)",
			loadingForm: "Loading form...",
			submitting: "Submitting...",
			submitDetails: "Submit Details",
			formSubmittedSuccessfully: "Form submitted successfully!",
			cancel: "Cancel",
			name: "Name",
			yourName: "Your name",
			nameRequired: "Name is required",
			email: "Email",
			emailPlaceholder: "you@example.com",
			emailRequired: "Email is required",
			message: "Message",
			howCanWeHelp: "How can we help?",
			messageRequired: "Message is required",
			sendMessage: "Send Message",
			thanksWellGetBack: "Thanks! We'll get back to you soon.",
			somethingWentWrongTryAgain: "Something went wrong. Please try again.",
		},
		escalation: {
			positiveFeedback: "That answered my question",
			requestHuman: "Connect to an agent 👤",
		},
		time: {
			justNow: "Just now",
			minutesAgo: "{count}m ago",
			hoursAgo: "{count}h ago",
			yesterday: "Yesterday",
			daysAgo: "{count}d ago",
			weeksAgo: "{count}w ago",
			monthsAgo: "{count}mo ago",
		},
		misc: {
			poweredByAnsa: "Powered by Ansa",
		},
		triggers: {
			greeting: "Hi there! 👋",
			startConversation: "Start a conversation",
		},
	},

	es: {
		header: {
			alwaysOnline: "Siempre en línea",
			humanAgentConnected: "Agente Humano Conectado",
		},
		buttons: {
			collapse: "Contraer",
			expand: "Expandir",
			copy: "Copiar mensaje",
			helpful: "Buena respuesta",
			notHelpful: "Mala respuesta",
			chatWithUs: "Chatea con nosotros",
		},
		menu: {
			startNewChat: "Iniciar nuevo chat",
			endChat: "Finalizar chat",
			viewRecentChats: "Ver chats recientes",
		},
		chat: {
			thinking: "Pensando",
			seen: "Visto",
			supportAgent: "Agente de Soporte",
			automated: "Automatizado",
			conversationResolved: "Conversación Resuelta",
			rateLimitReached: "Límite de Mensajes Alcanzado",
			startNewChat: "Iniciar Nuevo Chat",
			resolutionMessage:
				"Esta conversación ha sido resuelta por nuestro equipo de soporte. ¡Gracias por contactarnos!",
			escalationConfirmation:
				"Tu solicitud ha sido enviada a nuestro equipo de soporte humano. Responderán pronto.",
		},
		endChat: {
			title: "Chat Finalizado",
			description:
				"Gracias por chatear con nosotros. Una transcripción de esta sesión se ha guardado en tu historial.",
			rateQuality: "Calificar Calidad",
			required: "Requerido",
			bad: "Malo",
			okay: "Regular",
			good: "Bueno",
			great: "Excelente",
			additionalFeedback: "Comentarios Adicionales",
			feedbackPlaceholder: "Cuéntanos más sobre tu experiencia...",
			submitReview: "Enviar Reseña",
			startNewChat: "Iniciar Nuevo Chat",
		},
		home: {
			online: "En línea",
			humanAgents: "Agentes Humanos:",
			available: "Disponibles",
			suggestedActions: "Acciones Sugeridas",
		},
		recentChats: {
			title: "Chats Recientes",
			empty: "No hay chats recientes",
			messages: "mensajes",
			resolved: "Resuelto",
			open: "Abierto",
		},
		errors: {
			somethingWentWrong: "Lo sentimos, algo salió mal. Por favor intenta de nuevo.",
			formTimeout: "Tiempo de espera del formulario agotado",
			clientHandlerFailed: "Error en el manejador del cliente",
			formSubmissionFailed: "Error al enviar el formulario",
			brandingRequired: "Este chat requiere que se muestre la marca de Ansa.",
			offlineQueue: "pendiente(s). Se enviará cuando se reconecte.",
			messageFailed: "Error al enviar",
			tapToRetry: "Toca para reintentar",
		},
		connection: {
			reconnect: "Reconectar",
			disconnectedTap: "Desconectado. Toca para reconectar.",
		},
		forms: {
			formSubmitted: "Formulario enviado:",
			customerSatisfactionSurvey: "Encuesta de Satisfacción del Cliente",
			satisfactionIntro: "¡Gracias por contactarnos! Nos encantaría conocer tu experiencia.",
			satisfactionDescription: "Ayúdanos a mejorar nuestro servicio",
			satisfactionQuestion: "¿Qué tan satisfecho estás con la resolución?",
			verySatisfied: "⭐⭐⭐⭐⭐ Muy Satisfecho",
			satisfied: "⭐⭐⭐⭐ Satisfecho",
			neutral: "⭐⭐⭐ Neutral",
			dissatisfied: "⭐⭐ Insatisfecho",
			veryDissatisfied: "⭐ Muy Insatisfecho",
			additionalFeedbackOptional: "¿Algún comentario adicional? (opcional)",
			loadingForm: "Cargando formulario...",
			submitting: "Enviando...",
			submitDetails: "Enviar Detalles",
			formSubmittedSuccessfully: "¡Formulario enviado con éxito!",
			cancel: "Cancelar",
			name: "Nombre",
			yourName: "Tu nombre",
			nameRequired: "El nombre es obligatorio",
			email: "Correo electrónico",
			emailPlaceholder: "tu@ejemplo.com",
			emailRequired: "El correo electrónico es obligatorio",
			message: "Mensaje",
			howCanWeHelp: "¿Cómo podemos ayudarte?",
			messageRequired: "El mensaje es obligatorio",
			sendMessage: "Enviar Mensaje",
			thanksWellGetBack: "¡Gracias! Te responderemos pronto.",
			somethingWentWrongTryAgain: "Algo salió mal. Por favor, inténtalo de nuevo.",
		},
		escalation: {
			positiveFeedback: "Eso respondió mi pregunta",
			requestHuman: "Conectar con un agente 👤",
		},
		time: {
			justNow: "Ahora mismo",
			minutesAgo: "Hace {count}m",
			hoursAgo: "Hace {count}h",
			yesterday: "Ayer",
			daysAgo: "Hace {count}d",
			weeksAgo: "Hace {count}sem",
			monthsAgo: "Hace {count}mes",
		},
		misc: {
			poweredByAnsa: "Desarrollado por Ansa",
		},
		triggers: {
			greeting: "¡Hola! 👋",
			startConversation: "Iniciar una conversación",
		},
	},

	fr: {
		header: {
			alwaysOnline: "Toujours en ligne",
			humanAgentConnected: "Agent Humain Connecté",
		},
		buttons: {
			collapse: "Réduire",
			expand: "Agrandir",
			copy: "Copier le message",
			helpful: "Bonne réponse",
			notHelpful: "Mauvaise réponse",
			chatWithUs: "Discutez avec nous",
		},
		menu: {
			startNewChat: "Démarrer une nouvelle conversation",
			endChat: "Terminer la conversation",
			viewRecentChats: "Voir les conversations récentes",
		},
		chat: {
			thinking: "Réflexion",
			seen: "Vu",
			supportAgent: "Agent de Support",
			automated: "Automatisé",
			conversationResolved: "Conversation Résolue",
			rateLimitReached: "Limite de Messages Atteinte",
			startNewChat: "Démarrer une Nouvelle Conversation",
			resolutionMessage:
				"Cette conversation a été résolue par notre équipe de support. Merci de nous avoir contactés !",
			escalationConfirmation:
				"Votre demande a été transmise à notre équipe de support humain. Ils vous répondront bientôt.",
		},
		endChat: {
			title: "Conversation Terminée",
			description:
				"Merci d'avoir discuté avec nous. Une transcription de cette session a été enregistrée dans votre historique.",
			rateQuality: "Évaluer la Qualité",
			required: "Requis",
			bad: "Mauvais",
			okay: "Correct",
			good: "Bon",
			great: "Excellent",
			additionalFeedback: "Commentaires Supplémentaires",
			feedbackPlaceholder: "Dites-nous en plus sur votre expérience...",
			submitReview: "Soumettre l'Avis",
			startNewChat: "Nouvelle Conversation",
		},
		home: {
			online: "En ligne",
			humanAgents: "Agents Humains :",
			available: "Disponibles",
			suggestedActions: "Actions Suggérées",
		},
		recentChats: {
			title: "Conversations Récentes",
			empty: "Aucune conversation récente",
			messages: "messages",
			resolved: "Résolu",
			open: "Ouvert",
		},
		errors: {
			somethingWentWrong: "Désolé, une erreur s'est produite. Veuillez réessayer.",
			formTimeout: "Délai d'attente du formulaire dépassé",
			clientHandlerFailed: "Échec du gestionnaire client",
			formSubmissionFailed: "Échec de l'envoi du formulaire",
			brandingRequired: "Ce chat nécessite l'affichage de la marque Ansa.",
			offlineQueue: "en attente. Sera envoyé lors de la reconnexion.",
			messageFailed: "Échec de l'envoi",
			tapToRetry: "Appuyez pour réessayer",
		},
		connection: {
			reconnect: "Reconnecter",
			disconnectedTap: "Déconnecté. Appuyez pour reconnecter.",
		},
		forms: {
			formSubmitted: "Formulaire soumis :",
			customerSatisfactionSurvey: "Enquête de Satisfaction Client",
			satisfactionIntro:
				"Merci de nous avoir contactés ! Nous aimerions connaître votre expérience.",
			satisfactionDescription: "Aidez-nous à améliorer notre service",
			satisfactionQuestion: "Êtes-vous satisfait de la résolution ?",
			verySatisfied: "⭐⭐⭐⭐⭐ Très Satisfait",
			satisfied: "⭐⭐⭐⭐ Satisfait",
			neutral: "⭐⭐⭐ Neutre",
			dissatisfied: "⭐⭐ Insatisfait",
			veryDissatisfied: "⭐ Très Insatisfait",
			additionalFeedbackOptional: "Des commentaires supplémentaires ? (optionnel)",
			loadingForm: "Chargement du formulaire...",
			submitting: "Envoi en cours...",
			submitDetails: "Soumettre les Détails",
			formSubmittedSuccessfully: "Formulaire soumis avec succès !",
			cancel: "Annuler",
			name: "Nom",
			yourName: "Votre nom",
			nameRequired: "Le nom est requis",
			email: "E-mail",
			emailPlaceholder: "vous@exemple.com",
			emailRequired: "L'e-mail est requis",
			message: "Message",
			howCanWeHelp: "Comment pouvons-nous vous aider ?",
			messageRequired: "Le message est requis",
			sendMessage: "Envoyer le Message",
			thanksWellGetBack: "Merci ! Nous vous répondrons bientôt.",
			somethingWentWrongTryAgain: "Une erreur s'est produite. Veuillez réessayer.",
		},
		escalation: {
			positiveFeedback: "Cela a répondu à ma question",
			requestHuman: "Parler à un agent 👤",
		},
		time: {
			justNow: "À l'instant",
			minutesAgo: "Il y a {count}m",
			hoursAgo: "Il y a {count}h",
			yesterday: "Hier",
			daysAgo: "Il y a {count}j",
			weeksAgo: "Il y a {count}sem",
			monthsAgo: "Il y a {count}mois",
		},
		misc: {
			poweredByAnsa: "Propulsé par Ansa",
		},
		triggers: {
			greeting: "Bonjour ! 👋",
			startConversation: "Démarrer une conversation",
		},
	},

	de: {
		header: {
			alwaysOnline: "Immer online",
			humanAgentConnected: "Menschlicher Agent verbunden",
		},
		buttons: {
			collapse: "Minimieren",
			expand: "Erweitern",
			copy: "Nachricht kopieren",
			helpful: "Gute Antwort",
			notHelpful: "Schlechte Antwort",
			chatWithUs: "Chatte mit uns",
		},
		menu: {
			startNewChat: "Neuen Chat starten",
			endChat: "Chat beenden",
			viewRecentChats: "Letzte Chats anzeigen",
		},
		chat: {
			thinking: "Denkt nach",
			seen: "Gesehen",
			supportAgent: "Support-Mitarbeiter",
			automated: "Automatisiert",
			conversationResolved: "Gespräch Gelöst",
			rateLimitReached: "Nachrichtenlimit Erreicht",
			startNewChat: "Neuen Chat Starten",
			resolutionMessage:
				"Dieses Gespräch wurde von unserem Support-Team gelöst. Vielen Dank für Ihre Kontaktaufnahme!",
			escalationConfirmation:
				"Ihre Anfrage wurde an unser menschliches Support-Team weitergeleitet. Sie werden sich bald melden.",
		},
		endChat: {
			title: "Chat Beendet",
			description:
				"Vielen Dank für das Gespräch. Ein Protokoll dieser Sitzung wurde in Ihrem Verlauf gespeichert.",
			rateQuality: "Qualität Bewerten",
			required: "Erforderlich",
			bad: "Schlecht",
			okay: "In Ordnung",
			good: "Gut",
			great: "Ausgezeichnet",
			additionalFeedback: "Zusätzliches Feedback",
			feedbackPlaceholder: "Erzählen Sie uns mehr über Ihre Erfahrung...",
			submitReview: "Bewertung Absenden",
			startNewChat: "Neuen Chat Starten",
		},
		home: {
			online: "Online",
			humanAgents: "Menschliche Agenten:",
			available: "Verfügbar",
			suggestedActions: "Vorgeschlagene Aktionen",
		},
		recentChats: {
			title: "Letzte Chats",
			empty: "Keine letzten Chats",
			messages: "Nachrichten",
			resolved: "Gelöst",
			open: "Offen",
		},
		errors: {
			somethingWentWrong:
				"Entschuldigung, etwas ist schief gelaufen. Bitte versuchen Sie es erneut.",
			formTimeout: "Formular-Zeitüberschreitung",
			clientHandlerFailed: "Client-Handler fehlgeschlagen",
			formSubmissionFailed: "Formular konnte nicht gesendet werden",
			brandingRequired: "Dieser Chat erfordert die Anzeige des Ansa-Brandings.",
			offlineQueue: "ausstehend. Wird bei Wiederverbindung gesendet.",
			messageFailed: "Senden fehlgeschlagen",
			tapToRetry: "Tippen zum Wiederholen",
		},
		connection: {
			reconnect: "Neu verbinden",
			disconnectedTap: "Getrennt. Tippen zum Verbinden.",
		},
		forms: {
			formSubmitted: "Formular eingereicht:",
			customerSatisfactionSurvey: "Kundenzufriedenheitsumfrage",
			satisfactionIntro:
				"Vielen Dank für Ihre Kontaktaufnahme! Wir würden gerne von Ihrer Erfahrung hören.",
			satisfactionDescription: "Helfen Sie uns, unseren Service zu verbessern",
			satisfactionQuestion: "Wie zufrieden sind Sie mit der Lösung?",
			verySatisfied: "⭐⭐⭐⭐⭐ Sehr Zufrieden",
			satisfied: "⭐⭐⭐⭐ Zufrieden",
			neutral: "⭐⭐⭐ Neutral",
			dissatisfied: "⭐⭐ Unzufrieden",
			veryDissatisfied: "⭐ Sehr Unzufrieden",
			additionalFeedbackOptional: "Weiteres Feedback? (optional)",
			loadingForm: "Formular wird geladen...",
			submitting: "Wird gesendet...",
			submitDetails: "Details Absenden",
			formSubmittedSuccessfully: "Formular erfolgreich gesendet!",
			cancel: "Abbrechen",
			name: "Name",
			yourName: "Ihr Name",
			nameRequired: "Name ist erforderlich",
			email: "E-Mail",
			emailPlaceholder: "sie@beispiel.de",
			emailRequired: "E-Mail ist erforderlich",
			message: "Nachricht",
			howCanWeHelp: "Wie können wir Ihnen helfen?",
			messageRequired: "Nachricht ist erforderlich",
			sendMessage: "Nachricht Senden",
			thanksWellGetBack: "Danke! Wir melden uns bald bei Ihnen.",
			somethingWentWrongTryAgain: "Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.",
		},
		escalation: {
			positiveFeedback: "Das hat meine Frage beantwortet",
			requestHuman: "Mit einem Agenten verbinden 👤",
		},
		time: {
			justNow: "Gerade eben",
			minutesAgo: "Vor {count}m",
			hoursAgo: "Vor {count}h",
			yesterday: "Gestern",
			daysAgo: "Vor {count}T",
			weeksAgo: "Vor {count}W",
			monthsAgo: "Vor {count}Mo",
		},
		misc: {
			poweredByAnsa: "Unterstützt von Ansa",
		},
		triggers: {
			greeting: "Hallo! 👋",
			startConversation: "Gespräch starten",
		},
	},

	it: {
		header: {
			alwaysOnline: "Sempre online",
			humanAgentConnected: "Agente Umano Connesso",
		},
		buttons: {
			collapse: "Riduci",
			expand: "Espandi",
			copy: "Copia messaggio",
			helpful: "Buona risposta",
			notHelpful: "Cattiva risposta",
			chatWithUs: "Chatta con noi",
		},
		menu: {
			startNewChat: "Avvia nuova chat",
			endChat: "Termina chat",
			viewRecentChats: "Visualizza chat recenti",
		},
		chat: {
			thinking: "Sto pensando",
			seen: "Visto",
			supportAgent: "Agente di Supporto",
			automated: "Automatizzato",
			conversationResolved: "Conversazione Risolta",
			rateLimitReached: "Limite di Messaggi Raggiunto",
			startNewChat: "Avvia Nuova Chat",
			resolutionMessage:
				"Questa conversazione è stata risolta dal nostro team di supporto. Grazie per averci contattato!",
			escalationConfirmation:
				"La tua richiesta è stata inoltrata al nostro team di supporto umano. Risponderanno presto.",
		},
		endChat: {
			title: "Chat Terminata",
			description:
				"Grazie per aver chattato con noi. Una trascrizione di questa sessione è stata salvata nella tua cronologia.",
			rateQuality: "Valuta la Qualità",
			required: "Obbligatorio",
			bad: "Scarso",
			okay: "Discreto",
			good: "Buono",
			great: "Ottimo",
			additionalFeedback: "Feedback Aggiuntivo",
			feedbackPlaceholder: "Raccontaci di più sulla tua esperienza...",
			submitReview: "Invia Recensione",
			startNewChat: "Avvia Nuova Chat",
		},
		home: {
			online: "Online",
			humanAgents: "Agenti Umani:",
			available: "Disponibili",
			suggestedActions: "Azioni Suggerite",
		},
		recentChats: {
			title: "Chat Recenti",
			empty: "Nessuna chat recente",
			messages: "messaggi",
			resolved: "Risolto",
			open: "Aperto",
		},
		errors: {
			somethingWentWrong: "Spiacenti, qualcosa è andato storto. Per favore riprova.",
			formTimeout: "Timeout del gestore del modulo",
			clientHandlerFailed: "Gestore client fallito",
			formSubmissionFailed: "Invio modulo fallito",
			brandingRequired: "Questa chat richiede la visualizzazione del marchio Ansa.",
			offlineQueue: "in sospeso. Verrà inviato alla riconnessione.",
			messageFailed: "Invio fallito",
			tapToRetry: "Tocca per riprovare",
		},
		connection: {
			reconnect: "Riconnetti",
			disconnectedTap: "Disconnesso. Tocca per riconnetterti.",
		},
		forms: {
			formSubmitted: "Modulo inviato:",
			customerSatisfactionSurvey: "Sondaggio sulla Soddisfazione del Cliente",
			satisfactionIntro: "Grazie per averci contattato! Ci piacerebbe conoscere la tua esperienza.",
			satisfactionDescription: "Aiutaci a migliorare il nostro servizio",
			satisfactionQuestion: "Quanto sei soddisfatto della risoluzione?",
			verySatisfied: "⭐⭐⭐⭐⭐ Molto Soddisfatto",
			satisfied: "⭐⭐⭐⭐ Soddisfatto",
			neutral: "⭐⭐⭐ Neutrale",
			dissatisfied: "⭐⭐ Insoddisfatto",
			veryDissatisfied: "⭐ Molto Insoddisfatto",
			additionalFeedbackOptional: "Qualche feedback aggiuntivo? (opzionale)",
			loadingForm: "Caricamento modulo...",
			submitting: "Invio in corso...",
			submitDetails: "Invia Dettagli",
			formSubmittedSuccessfully: "Modulo inviato con successo!",
			cancel: "Annulla",
			name: "Nome",
			yourName: "Il tuo nome",
			nameRequired: "Il nome è obbligatorio",
			email: "Email",
			emailPlaceholder: "tu@esempio.com",
			emailRequired: "L'email è obbligatoria",
			message: "Messaggio",
			howCanWeHelp: "Come possiamo aiutarti?",
			messageRequired: "Il messaggio è obbligatorio",
			sendMessage: "Invia Messaggio",
			thanksWellGetBack: "Grazie! Ti risponderemo presto.",
			somethingWentWrongTryAgain: "Qualcosa è andato storto. Per favore riprova.",
		},
		escalation: {
			positiveFeedback: "Questo ha risposto alla mia domanda",
			requestHuman: "Connetti a un agente 👤",
		},
		time: {
			justNow: "Proprio ora",
			minutesAgo: "{count}m fa",
			hoursAgo: "{count}h fa",
			yesterday: "Ieri",
			daysAgo: "{count}g fa",
			weeksAgo: "{count}sett fa",
			monthsAgo: "{count}mese fa",
		},
		misc: {
			poweredByAnsa: "Offerto da Ansa",
		},
		triggers: {
			greeting: "Ciao! 👋",
			startConversation: "Inizia una conversazione",
		},
	},

	pt: {
		header: {
			alwaysOnline: "Sempre online",
			humanAgentConnected: "Agente Humano Conectado",
		},
		buttons: {
			collapse: "Recolher",
			expand: "Expandir",
			copy: "Copiar mensagem",
			helpful: "Boa resposta",
			notHelpful: "Má resposta",
			chatWithUs: "Fale conosco",
		},
		menu: {
			startNewChat: "Iniciar novo chat",
			endChat: "Encerrar chat",
			viewRecentChats: "Ver chats recentes",
		},
		chat: {
			thinking: "Pensando",
			seen: "Visto",
			supportAgent: "Agente de Suporte",
			automated: "Automatizado",
			conversationResolved: "Conversa Resolvida",
			rateLimitReached: "Limite de Mensagens Atingido",
			startNewChat: "Iniciar Novo Chat",
			resolutionMessage:
				"Esta conversa foi resolvida pela nossa equipe de suporte. Obrigado por entrar em contato!",
			escalationConfirmation:
				"Sua solicitação foi encaminhada para nossa equipe de suporte humano. Eles responderão em breve.",
		},
		endChat: {
			title: "Chat Encerrado",
			description:
				"Obrigado por conversar conosco. Uma transcrição desta sessão foi salva no seu histórico.",
			rateQuality: "Avaliar Qualidade",
			required: "Obrigatório",
			bad: "Ruim",
			okay: "Regular",
			good: "Bom",
			great: "Ótimo",
			additionalFeedback: "Feedback Adicional",
			feedbackPlaceholder: "Conte-nos mais sobre sua experiência...",
			submitReview: "Enviar Avaliação",
			startNewChat: "Iniciar Novo Chat",
		},
		home: {
			online: "Online",
			humanAgents: "Agentes Humanos:",
			available: "Disponíveis",
			suggestedActions: "Ações Sugeridas",
		},
		recentChats: {
			title: "Chats Recentes",
			empty: "Nenhum chat recente",
			messages: "mensagens",
			resolved: "Resolvido",
			open: "Aberto",
		},
		errors: {
			somethingWentWrong: "Desculpe, algo deu errado. Por favor, tente novamente.",
			formTimeout: "Tempo limite do formulário esgotado",
			clientHandlerFailed: "Falha no manipulador do cliente",
			formSubmissionFailed: "Falha ao enviar formulário",
			brandingRequired: "Este chat requer a exibição da marca Ansa.",
			offlineQueue: "pendente(s). Será enviado quando reconectar.",
			messageFailed: "Falha ao enviar",
			tapToRetry: "Toque para tentar novamente",
		},
		connection: {
			reconnect: "Reconectar",
			disconnectedTap: "Desconectado. Toque para reconectar.",
		},
		forms: {
			formSubmitted: "Formulário enviado:",
			customerSatisfactionSurvey: "Pesquisa de Satisfação do Cliente",
			satisfactionIntro:
				"Obrigado por entrar em contato! Gostaríamos de saber sobre sua experiência.",
			satisfactionDescription: "Ajude-nos a melhorar nosso serviço",
			satisfactionQuestion: "Quão satisfeito você está com a resolução?",
			verySatisfied: "⭐⭐⭐⭐⭐ Muito Satisfeito",
			satisfied: "⭐⭐⭐⭐ Satisfeito",
			neutral: "⭐⭐⭐ Neutro",
			dissatisfied: "⭐⭐ Insatisfeito",
			veryDissatisfied: "⭐ Muito Insatisfeito",
			additionalFeedbackOptional: "Algum feedback adicional? (opcional)",
			loadingForm: "Carregando formulário...",
			submitting: "Enviando...",
			submitDetails: "Enviar Detalhes",
			formSubmittedSuccessfully: "Formulário enviado com sucesso!",
			cancel: "Cancelar",
			name: "Nome",
			yourName: "Seu nome",
			nameRequired: "O nome é obrigatório",
			email: "Email",
			emailPlaceholder: "voce@exemplo.com",
			emailRequired: "O email é obrigatório",
			message: "Mensagem",
			howCanWeHelp: "Como podemos ajudá-lo?",
			messageRequired: "A mensagem é obrigatória",
			sendMessage: "Enviar Mensagem",
			thanksWellGetBack: "Obrigado! Responderemos em breve.",
			somethingWentWrongTryAgain: "Algo deu errado. Por favor, tente novamente.",
		},
		escalation: {
			positiveFeedback: "Isso respondeu minha pergunta",
			requestHuman: "Conectar a um agente 👤",
		},
		time: {
			justNow: "Agora mesmo",
			minutesAgo: "Há {count}m",
			hoursAgo: "Há {count}h",
			yesterday: "Ontem",
			daysAgo: "Há {count}d",
			weeksAgo: "Há {count}sem",
			monthsAgo: "Há {count}mês",
		},
		misc: {
			poweredByAnsa: "Desenvolvido por Ansa",
		},
		triggers: {
			greeting: "Olá! 👋",
			startConversation: "Iniciar uma conversa",
		},
	},

	ja: {
		header: {
			alwaysOnline: "常時オンライン",
			humanAgentConnected: "担当者に接続しました",
		},
		buttons: {
			collapse: "折りたたむ",
			expand: "展開",
			copy: "メッセージをコピー",
			helpful: "良い回答",
			notHelpful: "悪い回答",
			chatWithUs: "お問い合わせ",
		},
		menu: {
			startNewChat: "新しいチャットを開始",
			endChat: "チャットを終了",
			viewRecentChats: "最近のチャットを表示",
		},
		chat: {
			thinking: "考え中",
			seen: "既読",
			supportAgent: "サポート担当者",
			automated: "自動応答",
			conversationResolved: "会話が解決しました",
			rateLimitReached: "メッセージ上限に達しました",
			startNewChat: "新しいチャットを開始",
			resolutionMessage:
				"この会話はサポートチームによって解決されました。お問い合わせありがとうございました！",
			escalationConfirmation:
				"リクエストは人間のサポートチームに転送されました。まもなく返信いたします。",
		},
		endChat: {
			title: "チャット終了",
			description:
				"チャットをご利用いただきありがとうございます。このセッションの記録は履歴に保存されました。",
			rateQuality: "品質を評価",
			required: "必須",
			bad: "悪い",
			okay: "普通",
			good: "良い",
			great: "とても良い",
			additionalFeedback: "追加のフィードバック",
			feedbackPlaceholder: "体験について詳しくお聞かせください...",
			submitReview: "レビューを送信",
			startNewChat: "新しいチャットを開始",
		},
		home: {
			online: "オンライン",
			humanAgents: "担当者:",
			available: "対応可能",
			suggestedActions: "おすすめのアクション",
		},
		recentChats: {
			title: "最近のチャット",
			empty: "最近のチャットはありません",
			messages: "件のメッセージ",
			resolved: "解決済み",
			open: "未解決",
		},
		errors: {
			somethingWentWrong: "申し訳ございません。エラーが発生しました。もう一度お試しください。",
			formTimeout: "フォームハンドラーがタイムアウトしました",
			clientHandlerFailed: "クライアントハンドラーが失敗しました",
			formSubmissionFailed: "フォームの送信に失敗しました",
			brandingRequired: "このチャットにはAnsaブランディングの表示が必要です。",
			offlineQueue: "件保留中。再接続時に送信されます。",
			messageFailed: "送信失敗",
			tapToRetry: "タップして再試行",
		},
		connection: {
			reconnect: "再接続",
			disconnectedTap: "切断されました。タップして再接続。",
		},
		forms: {
			formSubmitted: "フォーム送信完了:",
			customerSatisfactionSurvey: "お客様満足度調査",
			satisfactionIntro:
				"お問い合わせいただきありがとうございます！ご体験についてお聞かせください。",
			satisfactionDescription: "サービス向上にご協力ください",
			satisfactionQuestion: "解決にどの程度満足していますか？",
			verySatisfied: "⭐⭐⭐⭐⭐ とても満足",
			satisfied: "⭐⭐⭐⭐ 満足",
			neutral: "⭐⭐⭐ 普通",
			dissatisfied: "⭐⭐ 不満",
			veryDissatisfied: "⭐ とても不満",
			additionalFeedbackOptional: "その他のご意見（任意）",
			loadingForm: "フォームを読み込み中...",
			submitting: "送信中...",
			submitDetails: "詳細を送信",
			formSubmittedSuccessfully: "フォームが正常に送信されました！",
			cancel: "キャンセル",
			name: "お名前",
			yourName: "お名前を入力",
			nameRequired: "お名前は必須です",
			email: "メールアドレス",
			emailPlaceholder: "you@example.com",
			emailRequired: "メールアドレスは必須です",
			message: "メッセージ",
			howCanWeHelp: "どのようなご用件でしょうか？",
			messageRequired: "メッセージは必須です",
			sendMessage: "メッセージを送信",
			thanksWellGetBack: "ありがとうございます！まもなくご連絡いたします。",
			somethingWentWrongTryAgain: "エラーが発生しました。もう一度お試しください。",
		},
		escalation: {
			positiveFeedback: "質問に答えてもらえました",
			requestHuman: "担当者に接続 👤",
		},
		time: {
			justNow: "たった今",
			minutesAgo: "{count}分前",
			hoursAgo: "{count}時間前",
			yesterday: "昨日",
			daysAgo: "{count}日前",
			weeksAgo: "{count}週間前",
			monthsAgo: "{count}ヶ月前",
		},
		misc: {
			poweredByAnsa: "Powered by Ansa",
		},
		triggers: {
			greeting: "こんにちは！👋",
			startConversation: "会話を始める",
		},
	},

	zh: {
		header: {
			alwaysOnline: "全天在线",
			humanAgentConnected: "已连接人工客服",
		},
		buttons: {
			collapse: "收起",
			expand: "展开",
			copy: "复制消息",
			helpful: "有帮助",
			notHelpful: "没帮助",
			chatWithUs: "联系我们",
		},
		menu: {
			startNewChat: "开始新对话",
			endChat: "结束对话",
			viewRecentChats: "查看最近对话",
		},
		chat: {
			thinking: "思考中",
			seen: "已读",
			supportAgent: "客服人员",
			automated: "自动回复",
			conversationResolved: "对话已解决",
			rateLimitReached: "消息已达上限",
			startNewChat: "开始新对话",
			resolutionMessage: "此对话已由我们的支持团队解决。感谢您的联系！",
			escalationConfirmation: "您的请求已转发给人工支持团队。他们将尽快回复。",
		},
		endChat: {
			title: "对话已结束",
			description: "感谢您与我们交流。此次会话的记录已保存到您的历史记录中。",
			rateQuality: "评价质量",
			required: "必填",
			bad: "差",
			okay: "一般",
			good: "好",
			great: "很好",
			additionalFeedback: "其他反馈",
			feedbackPlaceholder: "告诉我们更多关于您的体验...",
			submitReview: "提交评价",
			startNewChat: "开始新对话",
		},
		home: {
			online: "在线",
			humanAgents: "人工客服：",
			available: "可用",
			suggestedActions: "推荐操作",
		},
		recentChats: {
			title: "最近对话",
			empty: "没有最近的对话",
			messages: "条消息",
			resolved: "已解决",
			open: "进行中",
		},
		errors: {
			somethingWentWrong: "抱歉，出了点问题。请重试。",
			formTimeout: "表单处理超时",
			clientHandlerFailed: "客户端处理失败",
			formSubmissionFailed: "表单提交失败",
			brandingRequired: "此聊天需要显示Ansa品牌标识。",
			offlineQueue: "待发送。重新连接后将自动发送。",
			messageFailed: "发送失败",
			tapToRetry: "点击重试",
		},
		connection: {
			reconnect: "重新连接",
			disconnectedTap: "已断开。点击重新连接。",
		},
		forms: {
			formSubmitted: "表单已提交：",
			customerSatisfactionSurvey: "客户满意度调查",
			satisfactionIntro: "感谢您联系我们！我们想了解您的体验。",
			satisfactionDescription: "帮助我们改进服务",
			satisfactionQuestion: "您对解决方案的满意程度如何？",
			verySatisfied: "⭐⭐⭐⭐⭐ 非常满意",
			satisfied: "⭐⭐⭐⭐ 满意",
			neutral: "⭐⭐⭐ 一般",
			dissatisfied: "⭐⭐ 不满意",
			veryDissatisfied: "⭐ 非常不满意",
			additionalFeedbackOptional: "其他反馈（可选）",
			loadingForm: "加载表单中...",
			submitting: "提交中...",
			submitDetails: "提交详情",
			formSubmittedSuccessfully: "表单提交成功！",
			cancel: "取消",
			name: "姓名",
			yourName: "您的姓名",
			nameRequired: "姓名为必填项",
			email: "电子邮件",
			emailPlaceholder: "you@example.com",
			emailRequired: "电子邮件为必填项",
			message: "消息",
			howCanWeHelp: "我们可以如何帮助您？",
			messageRequired: "消息为必填项",
			sendMessage: "发送消息",
			thanksWellGetBack: "谢谢！我们会尽快回复您。",
			somethingWentWrongTryAgain: "出了点问题。请重试。",
		},
		escalation: {
			positiveFeedback: "这回答了我的问题",
			requestHuman: "联系人工客服 👤",
		},
		time: {
			justNow: "刚刚",
			minutesAgo: "{count}分钟前",
			hoursAgo: "{count}小时前",
			yesterday: "昨天",
			daysAgo: "{count}天前",
			weeksAgo: "{count}周前",
			monthsAgo: "{count}个月前",
		},
		misc: {
			poweredByAnsa: "由 Ansa 提供支持",
		},
		triggers: {
			greeting: "你好！👋",
			startConversation: "开始对话",
		},
	},

	ko: {
		header: {
			alwaysOnline: "항상 온라인",
			humanAgentConnected: "상담원 연결됨",
		},
		buttons: {
			collapse: "접기",
			expand: "펼치기",
			copy: "메시지 복사",
			helpful: "도움됨",
			notHelpful: "도움 안됨",
			chatWithUs: "문의하기",
		},
		menu: {
			startNewChat: "새 대화 시작",
			endChat: "대화 종료",
			viewRecentChats: "최근 대화 보기",
		},
		chat: {
			thinking: "생각 중",
			seen: "읽음",
			supportAgent: "상담원",
			automated: "자동 응답",
			conversationResolved: "대화 해결됨",
			rateLimitReached: "메시지 한도 도달",
			startNewChat: "새 대화 시작",
			resolutionMessage: "이 대화는 지원팀에 의해 해결되었습니다. 문의해 주셔서 감사합니다!",
			escalationConfirmation: "귀하의 요청이 상담원에게 전달되었습니다. 곧 응답해 드리겠습니다.",
		},
		endChat: {
			title: "대화 종료",
			description: "대화해 주셔서 감사합니다. 이 세션의 기록이 히스토리에 저장되었습니다.",
			rateQuality: "품질 평가",
			required: "필수",
			bad: "나쁨",
			okay: "보통",
			good: "좋음",
			great: "훌륭함",
			additionalFeedback: "추가 피드백",
			feedbackPlaceholder: "경험에 대해 더 알려주세요...",
			submitReview: "리뷰 제출",
			startNewChat: "새 대화 시작",
		},
		home: {
			online: "온라인",
			humanAgents: "상담원:",
			available: "대기 중",
			suggestedActions: "추천 액션",
		},
		recentChats: {
			title: "최근 대화",
			empty: "최근 대화 없음",
			messages: "개 메시지",
			resolved: "해결됨",
			open: "진행 중",
		},
		errors: {
			somethingWentWrong: "죄송합니다, 문제가 발생했습니다. 다시 시도해 주세요.",
			formTimeout: "폼 처리 시간 초과",
			clientHandlerFailed: "클라이언트 핸들러 실패",
			formSubmissionFailed: "폼 제출 실패",
			brandingRequired: "이 채팅에는 Ansa 브랜딩 표시가 필요합니다.",
			offlineQueue: "대기 중. 재연결 시 전송됩니다.",
			messageFailed: "전송 실패",
			tapToRetry: "탭하여 재시도",
		},
		connection: {
			reconnect: "재연결",
			disconnectedTap: "연결 끊김. 탭하여 재연결.",
		},
		forms: {
			formSubmitted: "폼 제출됨:",
			customerSatisfactionSurvey: "고객 만족도 조사",
			satisfactionIntro: "문의해 주셔서 감사합니다! 경험에 대해 알려주세요.",
			satisfactionDescription: "서비스 개선에 도움을 주세요",
			satisfactionQuestion: "해결에 얼마나 만족하셨나요?",
			verySatisfied: "⭐⭐⭐⭐⭐ 매우 만족",
			satisfied: "⭐⭐⭐⭐ 만족",
			neutral: "⭐⭐⭐ 보통",
			dissatisfied: "⭐⭐ 불만족",
			veryDissatisfied: "⭐ 매우 불만족",
			additionalFeedbackOptional: "추가 피드백이 있으신가요? (선택사항)",
			loadingForm: "폼 로딩 중...",
			submitting: "제출 중...",
			submitDetails: "세부정보 제출",
			formSubmittedSuccessfully: "폼이 성공적으로 제출되었습니다!",
			cancel: "취소",
			name: "이름",
			yourName: "이름을 입력하세요",
			nameRequired: "이름은 필수입니다",
			email: "이메일",
			emailPlaceholder: "you@example.com",
			emailRequired: "이메일은 필수입니다",
			message: "메시지",
			howCanWeHelp: "어떻게 도와드릴까요?",
			messageRequired: "메시지는 필수입니다",
			sendMessage: "메시지 보내기",
			thanksWellGetBack: "감사합니다! 곧 연락드리겠습니다.",
			somethingWentWrongTryAgain: "문제가 발생했습니다. 다시 시도해 주세요.",
		},
		escalation: {
			positiveFeedback: "질문에 답변해 주셨습니다",
			requestHuman: "상담원 연결 👤",
		},
		time: {
			justNow: "방금",
			minutesAgo: "{count}분 전",
			hoursAgo: "{count}시간 전",
			yesterday: "어제",
			daysAgo: "{count}일 전",
			weeksAgo: "{count}주 전",
			monthsAgo: "{count}개월 전",
		},
		misc: {
			poweredByAnsa: "Powered by Ansa",
		},
		triggers: {
			greeting: "안녕하세요! 👋",
			startConversation: "대화 시작하기",
		},
	},

	ar: {
		header: {
			alwaysOnline: "متصل دائماً",
			humanAgentConnected: "تم الاتصال بوكيل بشري",
		},
		buttons: {
			collapse: "طي",
			expand: "توسيع",
			copy: "نسخ الرسالة",
			helpful: "إجابة جيدة",
			notHelpful: "إجابة سيئة",
			chatWithUs: "تحدث معنا",
		},
		menu: {
			startNewChat: "بدء محادثة جديدة",
			endChat: "إنهاء المحادثة",
			viewRecentChats: "عرض المحادثات الأخيرة",
		},
		chat: {
			thinking: "جارٍ التفكير",
			seen: "تمت المشاهدة",
			supportAgent: "وكيل الدعم",
			automated: "آلي",
			conversationResolved: "تم حل المحادثة",
			rateLimitReached: "تم الوصول إلى حد الرسائل",
			startNewChat: "بدء محادثة جديدة",
			resolutionMessage: "تم حل هذه المحادثة من قبل فريق الدعم لدينا. شكراً لتواصلك معنا!",
			escalationConfirmation: "تم تحويل طلبك إلى فريق الدعم البشري لدينا. سيردون عليك قريباً.",
		},
		endChat: {
			title: "انتهت المحادثة",
			description: "شكراً للتحدث معنا. تم حفظ نسخة من هذه الجلسة في سجلك.",
			rateQuality: "تقييم الجودة",
			required: "مطلوب",
			bad: "سيء",
			okay: "مقبول",
			good: "جيد",
			great: "ممتاز",
			additionalFeedback: "ملاحظات إضافية",
			feedbackPlaceholder: "أخبرنا المزيد عن تجربتك...",
			submitReview: "إرسال التقييم",
			startNewChat: "بدء محادثة جديدة",
		},
		home: {
			online: "متصل",
			humanAgents: "الوكلاء البشريون:",
			available: "متاحون",
			suggestedActions: "الإجراءات المقترحة",
		},
		recentChats: {
			title: "المحادثات الأخيرة",
			empty: "لا توجد محادثات أخيرة",
			messages: "رسائل",
			resolved: "تم الحل",
			open: "مفتوح",
		},
		errors: {
			somethingWentWrong: "عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.",
			formTimeout: "انتهت مهلة معالج النموذج",
			clientHandlerFailed: "فشل معالج العميل",
			formSubmissionFailed: "فشل في إرسال النموذج",
			brandingRequired: "تتطلب هذه المحادثة عرض علامة Ansa التجارية.",
			offlineQueue: "معلق. سيتم الإرسال عند إعادة الاتصال.",
			messageFailed: "فشل الإرسال",
			tapToRetry: "انقر للمحاولة مرة أخرى",
		},
		connection: {
			reconnect: "إعادة الاتصال",
			disconnectedTap: "غير متصل. انقر لإعادة الاتصال.",
		},
		forms: {
			formSubmitted: "تم إرسال النموذج:",
			customerSatisfactionSurvey: "استطلاع رضا العملاء",
			satisfactionIntro: "شكراً لتواصلك معنا! نود أن نسمع عن تجربتك.",
			satisfactionDescription: "ساعدنا في تحسين خدمتنا",
			satisfactionQuestion: "ما مدى رضاك عن الحل؟",
			verySatisfied: "⭐⭐⭐⭐⭐ راضٍ جداً",
			satisfied: "⭐⭐⭐⭐ راضٍ",
			neutral: "⭐⭐⭐ محايد",
			dissatisfied: "⭐⭐ غير راضٍ",
			veryDissatisfied: "⭐ غير راضٍ جداً",
			additionalFeedbackOptional: "أي ملاحظات إضافية؟ (اختياري)",
			loadingForm: "جاري تحميل النموذج...",
			submitting: "جاري الإرسال...",
			submitDetails: "إرسال التفاصيل",
			formSubmittedSuccessfully: "تم إرسال النموذج بنجاح!",
			cancel: "إلغاء",
			name: "الاسم",
			yourName: "اسمك",
			nameRequired: "الاسم مطلوب",
			email: "البريد الإلكتروني",
			emailPlaceholder: "you@example.com",
			emailRequired: "البريد الإلكتروني مطلوب",
			message: "الرسالة",
			howCanWeHelp: "كيف يمكننا مساعدتك؟",
			messageRequired: "الرسالة مطلوبة",
			sendMessage: "إرسال الرسالة",
			thanksWellGetBack: "شكراً! سنرد عليك قريباً.",
			somethingWentWrongTryAgain: "حدث خطأ. يرجى المحاولة مرة أخرى.",
		},
		escalation: {
			positiveFeedback: "هذا أجاب على سؤالي",
			requestHuman: "الاتصال بوكيل 👤",
		},
		time: {
			justNow: "الآن",
			minutesAgo: "منذ {count}د",
			hoursAgo: "منذ {count}س",
			yesterday: "أمس",
			daysAgo: "منذ {count}ي",
			weeksAgo: "منذ {count}أ",
			monthsAgo: "منذ {count}ش",
		},
		misc: {
			poweredByAnsa: "مدعوم من Ansa",
		},
		triggers: {
			greeting: "مرحبًا! 👋",
			startConversation: "بدء محادثة",
		},
	},

	nl: {
		header: {
			alwaysOnline: "Altijd online",
			humanAgentConnected: "Menselijke Agent Verbonden",
		},
		buttons: {
			collapse: "Inklappen",
			expand: "Uitvouwen",
			copy: "Bericht kopiëren",
			helpful: "Goed antwoord",
			notHelpful: "Slecht antwoord",
			chatWithUs: "Chat met ons",
		},
		menu: {
			startNewChat: "Nieuwe chat starten",
			endChat: "Chat beëindigen",
			viewRecentChats: "Recente chats bekijken",
		},
		chat: {
			thinking: "Aan het denken",
			seen: "Gezien",
			supportAgent: "Supportmedewerker",
			automated: "Geautomatiseerd",
			conversationResolved: "Gesprek Opgelost",
			rateLimitReached: "Berichtlimiet Bereikt",
			startNewChat: "Nieuwe Chat Starten",
			resolutionMessage: "Dit gesprek is opgelost door ons supportteam. Bedankt voor het contact!",
			escalationConfirmation:
				"Uw verzoek is doorgestuurd naar ons menselijke supportteam. Ze zullen snel reageren.",
		},
		endChat: {
			title: "Chat Beëindigd",
			description:
				"Bedankt voor het chatten met ons. Een transcript van deze sessie is opgeslagen in uw geschiedenis.",
			rateQuality: "Kwaliteit Beoordelen",
			required: "Verplicht",
			bad: "Slecht",
			okay: "Oké",
			good: "Goed",
			great: "Uitstekend",
			additionalFeedback: "Extra Feedback",
			feedbackPlaceholder: "Vertel ons meer over uw ervaring...",
			submitReview: "Review Indienen",
			startNewChat: "Nieuwe Chat Starten",
		},
		home: {
			online: "Online",
			humanAgents: "Menselijke Agents:",
			available: "Beschikbaar",
			suggestedActions: "Voorgestelde Acties",
		},
		recentChats: {
			title: "Recente Chats",
			empty: "Geen recente chats",
			messages: "berichten",
			resolved: "Opgelost",
			open: "Open",
		},
		errors: {
			somethingWentWrong: "Sorry, er ging iets mis. Probeer het opnieuw.",
			formTimeout: "Formulier handler timeout",
			clientHandlerFailed: "Client handler mislukt",
			formSubmissionFailed: "Formulier indienen mislukt",
			brandingRequired: "Deze chat vereist dat Ansa branding wordt weergegeven.",
			offlineQueue: "in wachtrij. Wordt verzonden bij herverbinding.",
			messageFailed: "Verzenden mislukt",
			tapToRetry: "Tik om opnieuw te proberen",
		},
		connection: {
			reconnect: "Opnieuw verbinden",
			disconnectedTap: "Verbinding verbroken. Tik om opnieuw te verbinden.",
		},
		forms: {
			formSubmitted: "Formulier ingediend:",
			customerSatisfactionSurvey: "Klanttevredenheidsonderzoek",
			satisfactionIntro: "Bedankt voor het contact! We horen graag over uw ervaring.",
			satisfactionDescription: "Help ons onze service te verbeteren",
			satisfactionQuestion: "Hoe tevreden bent u met de oplossing?",
			verySatisfied: "⭐⭐⭐⭐⭐ Zeer Tevreden",
			satisfied: "⭐⭐⭐⭐ Tevreden",
			neutral: "⭐⭐⭐ Neutraal",
			dissatisfied: "⭐⭐ Ontevreden",
			veryDissatisfied: "⭐ Zeer Ontevreden",
			additionalFeedbackOptional: "Nog andere feedback? (optioneel)",
			loadingForm: "Formulier laden...",
			submitting: "Indienen...",
			submitDetails: "Details Indienen",
			formSubmittedSuccessfully: "Formulier succesvol ingediend!",
			cancel: "Annuleren",
			name: "Naam",
			yourName: "Uw naam",
			nameRequired: "Naam is verplicht",
			email: "E-mail",
			emailPlaceholder: "u@voorbeeld.nl",
			emailRequired: "E-mail is verplicht",
			message: "Bericht",
			howCanWeHelp: "Hoe kunnen we u helpen?",
			messageRequired: "Bericht is verplicht",
			sendMessage: "Bericht Versturen",
			thanksWellGetBack: "Bedankt! We nemen binnenkort contact op.",
			somethingWentWrongTryAgain: "Er ging iets mis. Probeer het opnieuw.",
		},
		escalation: {
			positiveFeedback: "Dat beantwoordde mijn vraag",
			requestHuman: "Verbind met een agent 👤",
		},
		time: {
			justNow: "Zojuist",
			minutesAgo: "{count}m geleden",
			hoursAgo: "{count}u geleden",
			yesterday: "Gisteren",
			daysAgo: "{count}d geleden",
			weeksAgo: "{count}w geleden",
			monthsAgo: "{count}ma geleden",
		},
		misc: {
			poweredByAnsa: "Mogelijk gemaakt door Ansa",
		},
		triggers: {
			greeting: "Hallo! 👋",
			startConversation: "Start een gesprek",
		},
	},

	ru: {
		header: {
			alwaysOnline: "Всегда онлайн",
			humanAgentConnected: "Оператор подключен",
		},
		buttons: {
			collapse: "Свернуть",
			expand: "Развернуть",
			copy: "Копировать сообщение",
			helpful: "Хороший ответ",
			notHelpful: "Плохой ответ",
			chatWithUs: "Напишите нам",
		},
		menu: {
			startNewChat: "Начать новый чат",
			endChat: "Завершить чат",
			viewRecentChats: "Посмотреть недавние чаты",
		},
		chat: {
			thinking: "Думаю",
			seen: "Просмотрено",
			supportAgent: "Оператор поддержки",
			automated: "Автоматический",
			conversationResolved: "Разговор завершен",
			rateLimitReached: "Достигнут Лимит Сообщений",
			startNewChat: "Начать Новый Чат",
			resolutionMessage: "Этот разговор был решен нашей командой поддержки. Спасибо за обращение!",
			escalationConfirmation:
				"Ваш запрос был передан нашей команде поддержки. Они ответят в ближайшее время.",
		},
		endChat: {
			title: "Чат завершен",
			description: "Спасибо за общение с нами. Запись этой сессии сохранена в вашей истории.",
			rateQuality: "Оценить качество",
			required: "Обязательно",
			bad: "Плохо",
			okay: "Нормально",
			good: "Хорошо",
			great: "Отлично",
			additionalFeedback: "Дополнительный отзыв",
			feedbackPlaceholder: "Расскажите подробнее о вашем опыте...",
			submitReview: "Отправить отзыв",
			startNewChat: "Начать новый чат",
		},
		home: {
			online: "Онлайн",
			humanAgents: "Операторы:",
			available: "Доступны",
			suggestedActions: "Рекомендуемые действия",
		},
		recentChats: {
			title: "Недавние чаты",
			empty: "Нет недавних чатов",
			messages: "сообщений",
			resolved: "Решено",
			open: "Открыт",
		},
		errors: {
			somethingWentWrong: "Извините, что-то пошло не так. Пожалуйста, попробуйте снова.",
			formTimeout: "Тайм-аут обработчика формы",
			clientHandlerFailed: "Ошибка клиентского обработчика",
			formSubmissionFailed: "Не удалось отправить форму",
			brandingRequired: "Этот чат требует отображения брендинга Ansa.",
			offlineQueue: "в ожидании. Будет отправлено при восстановлении соединения.",
			messageFailed: "Не удалось отправить",
			tapToRetry: "Нажмите для повтора",
		},
		connection: {
			reconnect: "Переподключиться",
			disconnectedTap: "Отключено. Нажмите для переподключения.",
		},
		forms: {
			formSubmitted: "Форма отправлена:",
			customerSatisfactionSurvey: "Опрос удовлетворенности клиентов",
			satisfactionIntro: "Спасибо за обращение! Мы хотели бы узнать о вашем опыте.",
			satisfactionDescription: "Помогите нам улучшить наш сервис",
			satisfactionQuestion: "Насколько вы удовлетворены решением?",
			verySatisfied: "⭐⭐⭐⭐⭐ Очень доволен",
			satisfied: "⭐⭐⭐⭐ Доволен",
			neutral: "⭐⭐⭐ Нейтрально",
			dissatisfied: "⭐⭐ Недоволен",
			veryDissatisfied: "⭐ Очень недоволен",
			additionalFeedbackOptional: "Дополнительные комментарии? (необязательно)",
			loadingForm: "Загрузка формы...",
			submitting: "Отправка...",
			submitDetails: "Отправить данные",
			formSubmittedSuccessfully: "Форма успешно отправлена!",
			cancel: "Отмена",
			name: "Имя",
			yourName: "Ваше имя",
			nameRequired: "Имя обязательно",
			email: "Электронная почта",
			emailPlaceholder: "you@example.com",
			emailRequired: "Электронная почта обязательна",
			message: "Сообщение",
			howCanWeHelp: "Как мы можем вам помочь?",
			messageRequired: "Сообщение обязательно",
			sendMessage: "Отправить сообщение",
			thanksWellGetBack: "Спасибо! Мы скоро свяжемся с вами.",
			somethingWentWrongTryAgain: "Что-то пошло не так. Пожалуйста, попробуйте снова.",
		},
		escalation: {
			positiveFeedback: "Это ответило на мой вопрос",
			requestHuman: "Связаться с оператором 👤",
		},
		time: {
			justNow: "Только что",
			minutesAgo: "{count}м назад",
			hoursAgo: "{count}ч назад",
			yesterday: "Вчера",
			daysAgo: "{count}д назад",
			weeksAgo: "{count}нед назад",
			monthsAgo: "{count}мес назад",
		},
		misc: {
			poweredByAnsa: "Работает на Ansa",
		},
		triggers: {
			greeting: "Привет! 👋",
			startConversation: "Начать разговор",
		},
	},

	tr: {
		header: {
			alwaysOnline: "Her zaman çevrimiçi",
			humanAgentConnected: "Canlı Destek Bağlandı",
		},
		buttons: {
			collapse: "Daralt",
			expand: "Genişlet",
			copy: "Mesajı kopyala",
			helpful: "İyi yanıt",
			notHelpful: "Kötü yanıt",
			chatWithUs: "Bizimle sohbet edin",
		},
		menu: {
			startNewChat: "Yeni sohbet başlat",
			endChat: "Sohbeti sonlandır",
			viewRecentChats: "Son sohbetleri görüntüle",
		},
		chat: {
			thinking: "Düşünüyor",
			seen: "Görüldü",
			supportAgent: "Destek Temsilcisi",
			automated: "Otomatik",
			conversationResolved: "Görüşme Çözüldü",
			rateLimitReached: "Mesaj Sınırına Ulaşıldı",
			startNewChat: "Yeni Sohbet Başlat",
			resolutionMessage:
				"Bu görüşme destek ekibimiz tarafından çözüldü. Bizimle iletişime geçtiğiniz için teşekkürler!",
			escalationConfirmation:
				"Talebiniz canlı destek ekibimize iletildi. En kısa sürede yanıt verecekler.",
		},
		endChat: {
			title: "Sohbet Sona Erdi",
			description:
				"Bizimle sohbet ettiğiniz için teşekkürler. Bu oturumun kaydı geçmişinize kaydedildi.",
			rateQuality: "Kaliteyi Değerlendir",
			required: "Zorunlu",
			bad: "Kötü",
			okay: "İdare eder",
			good: "İyi",
			great: "Harika",
			additionalFeedback: "Ek Geri Bildirim",
			feedbackPlaceholder: "Deneyiminiz hakkında daha fazla bilgi verin...",
			submitReview: "Değerlendirmeyi Gönder",
			startNewChat: "Yeni Sohbet Başlat",
		},
		home: {
			online: "Çevrimiçi",
			humanAgents: "Canlı Destek:",
			available: "Müsait",
			suggestedActions: "Önerilen Eylemler",
		},
		recentChats: {
			title: "Son Sohbetler",
			empty: "Son sohbet yok",
			messages: "mesaj",
			resolved: "Çözüldü",
			open: "Açık",
		},
		errors: {
			somethingWentWrong: "Üzgünüz, bir şeyler ters gitti. Lütfen tekrar deneyin.",
			formTimeout: "Form işleyici zaman aşımı",
			clientHandlerFailed: "İstemci işleyici başarısız",
			formSubmissionFailed: "Form gönderilemedi",
			brandingRequired: "Bu sohbet Ansa markasının görüntülenmesini gerektirir.",
			offlineQueue: "bekliyor. Yeniden bağlanıldığında gönderilecek.",
			messageFailed: "Gönderilemedi",
			tapToRetry: "Tekrar denemek için dokun",
		},
		connection: {
			reconnect: "Yeniden bağlan",
			disconnectedTap: "Bağlantı kesildi. Yeniden bağlanmak için dokun.",
		},
		forms: {
			formSubmitted: "Form gönderildi:",
			customerSatisfactionSurvey: "Müşteri Memnuniyeti Anketi",
			satisfactionIntro:
				"Bizimle iletişime geçtiğiniz için teşekkürler! Deneyiminiz hakkında bilgi almak istiyoruz.",
			satisfactionDescription: "Hizmetimizi geliştirmemize yardımcı olun",
			satisfactionQuestion: "Çözümden ne kadar memnunsunuz?",
			verySatisfied: "⭐⭐⭐⭐⭐ Çok Memnun",
			satisfied: "⭐⭐⭐⭐ Memnun",
			neutral: "⭐⭐⭐ Nötr",
			dissatisfied: "⭐⭐ Memnun Değil",
			veryDissatisfied: "⭐ Hiç Memnun Değil",
			additionalFeedbackOptional: "Ek geri bildiriminiz var mı? (isteğe bağlı)",
			loadingForm: "Form yükleniyor...",
			submitting: "Gönderiliyor...",
			submitDetails: "Detayları Gönder",
			formSubmittedSuccessfully: "Form başarıyla gönderildi!",
			cancel: "İptal",
			name: "İsim",
			yourName: "Adınız",
			nameRequired: "İsim gerekli",
			email: "E-posta",
			emailPlaceholder: "siz@ornek.com",
			emailRequired: "E-posta gerekli",
			message: "Mesaj",
			howCanWeHelp: "Size nasıl yardımcı olabiliriz?",
			messageRequired: "Mesaj gerekli",
			sendMessage: "Mesaj Gönder",
			thanksWellGetBack: "Teşekkürler! En kısa sürede dönüş yapacağız.",
			somethingWentWrongTryAgain: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
		},
		escalation: {
			positiveFeedback: "Bu sorumu yanıtladı",
			requestHuman: "Bir temsilciye bağlan 👤",
		},
		time: {
			justNow: "Az önce",
			minutesAgo: "{count}dk önce",
			hoursAgo: "{count}sa önce",
			yesterday: "Dün",
			daysAgo: "{count}g önce",
			weeksAgo: "{count}hf önce",
			monthsAgo: "{count}ay önce",
		},
		misc: {
			poweredByAnsa: "Ansa tarafından desteklenmektedir",
		},
		triggers: {
			greeting: "Merhaba! 👋",
			startConversation: "Sohbet başlat",
		},
	},

	hi: {
		header: {
			alwaysOnline: "हमेशा ऑनलाइन",
			humanAgentConnected: "मानव एजेंट जुड़ा",
		},
		buttons: {
			collapse: "छोटा करें",
			expand: "बड़ा करें",
			copy: "संदेश कॉपी करें",
			helpful: "अच्छा जवाब",
			notHelpful: "बुरा जवाब",
			chatWithUs: "हमसे बात करें",
		},
		menu: {
			startNewChat: "नई चैट शुरू करें",
			endChat: "चैट समाप्त करें",
			viewRecentChats: "हाल की चैट देखें",
		},
		chat: {
			thinking: "सोच रहा है",
			seen: "देखा गया",
			supportAgent: "सहायता एजेंट",
			automated: "स्वचालित",
			conversationResolved: "बातचीत हल हो गई",
			rateLimitReached: "संदेश सीमा पूरी हो गई",
			startNewChat: "नई चैट शुरू करें",
			resolutionMessage:
				"यह बातचीत हमारी सहायता टीम द्वारा हल कर दी गई है। हमसे संपर्क करने के लिए धन्यवाद!",
			escalationConfirmation:
				"आपका अनुरोध हमारी मानव सहायता टीम को भेज दिया गया है। वे जल्द ही जवाब देंगे।",
		},
		endChat: {
			title: "चैट समाप्त",
			description: "हमसे बात करने के लिए धन्यवाद। इस सत्र की प्रतिलिपि आपके इतिहास में सहेजी गई है।",
			rateQuality: "गुणवत्ता रेट करें",
			required: "आवश्यक",
			bad: "खराब",
			okay: "ठीक",
			good: "अच्छा",
			great: "बहुत अच्छा",
			additionalFeedback: "अतिरिक्त प्रतिक्रिया",
			feedbackPlaceholder: "अपने अनुभव के बारे में और बताएं...",
			submitReview: "समीक्षा जमा करें",
			startNewChat: "नई चैट शुरू करें",
		},
		home: {
			online: "ऑनलाइन",
			humanAgents: "मानव एजेंट:",
			available: "उपलब्ध",
			suggestedActions: "सुझाई गई कार्रवाइयां",
		},
		recentChats: {
			title: "हाल की चैट",
			empty: "कोई हाल की चैट नहीं",
			messages: "संदेश",
			resolved: "हल किया गया",
			open: "खुला",
		},
		errors: {
			somethingWentWrong: "क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
			formTimeout: "फॉर्म हैंडलर टाइमआउट",
			clientHandlerFailed: "क्लाइंट हैंडलर विफल",
			formSubmissionFailed: "फॉर्म जमा करने में विफल",
			brandingRequired: "इस चैट के लिए Ansa ब्रांडिंग प्रदर्शित करना आवश्यक है।",
			offlineQueue: "लंबित। पुनः कनेक्ट होने पर भेजा जाएगा।",
			messageFailed: "भेजने में विफल",
			tapToRetry: "पुनः प्रयास के लिए टैप करें",
		},
		connection: {
			reconnect: "पुनः कनेक्ट करें",
			disconnectedTap: "डिस्कनेक्ट हो गया। पुनः कनेक्ट करने के लिए टैप करें।",
		},
		forms: {
			formSubmitted: "फॉर्म जमा किया गया:",
			customerSatisfactionSurvey: "ग्राहक संतुष्टि सर्वेक्षण",
			satisfactionIntro: "हमसे संपर्क करने के लिए धन्यवाद! हम आपके अनुभव के बारे में जानना चाहेंगे।",
			satisfactionDescription: "हमारी सेवा को बेहतर बनाने में हमारी मदद करें",
			satisfactionQuestion: "आप समाधान से कितने संतुष्ट हैं?",
			verySatisfied: "⭐⭐⭐⭐⭐ बहुत संतुष्ट",
			satisfied: "⭐⭐⭐⭐ संतुष्ट",
			neutral: "⭐⭐⭐ तटस्थ",
			dissatisfied: "⭐⭐ असंतुष्ट",
			veryDissatisfied: "⭐ बहुत असंतुष्ट",
			additionalFeedbackOptional: "कोई अतिरिक्त प्रतिक्रिया? (वैकल्पिक)",
			loadingForm: "फॉर्म लोड हो रहा है...",
			submitting: "जमा किया जा रहा है...",
			submitDetails: "विवरण जमा करें",
			formSubmittedSuccessfully: "फॉर्म सफलतापूर्वक जमा हो गया!",
			cancel: "रद्द करें",
			name: "नाम",
			yourName: "आपका नाम",
			nameRequired: "नाम आवश्यक है",
			email: "ईमेल",
			emailPlaceholder: "you@example.com",
			emailRequired: "ईमेल आवश्यक है",
			message: "संदेश",
			howCanWeHelp: "हम आपकी कैसे मदद कर सकते हैं?",
			messageRequired: "संदेश आवश्यक है",
			sendMessage: "संदेश भेजें",
			thanksWellGetBack: "धन्यवाद! हम जल्द ही आपसे संपर्क करेंगे।",
			somethingWentWrongTryAgain: "कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
		},
		escalation: {
			positiveFeedback: "इसने मेरे सवाल का जवाब दिया",
			requestHuman: "एजेंट से जुड़ें 👤",
		},
		time: {
			justNow: "अभी",
			minutesAgo: "{count}मि पहले",
			hoursAgo: "{count}घं पहले",
			yesterday: "कल",
			daysAgo: "{count}दि पहले",
			weeksAgo: "{count}सप्ताह पहले",
			monthsAgo: "{count}महीने पहले",
		},
		misc: {
			poweredByAnsa: "Ansa द्वारा संचालित",
		},
		triggers: {
			greeting: "नमस्ते! 👋",
			startConversation: "बातचीत शुरू करें",
		},
	},

	pl: {
		header: {
			alwaysOnline: "Zawsze online",
			humanAgentConnected: "Agent połączony",
		},
		buttons: {
			collapse: "Zwiń",
			expand: "Rozwiń",
			copy: "Kopiuj wiadomość",
			helpful: "Dobra odpowiedź",
			notHelpful: "Zła odpowiedź",
			chatWithUs: "Porozmawiaj z nami",
		},
		menu: {
			startNewChat: "Rozpocznij nowy czat",
			endChat: "Zakończ czat",
			viewRecentChats: "Zobacz ostatnie czaty",
		},
		chat: {
			thinking: "Myślę",
			seen: "Wyświetlono",
			supportAgent: "Agent wsparcia",
			automated: "Automatyczny",
			conversationResolved: "Rozmowa rozwiązana",
			rateLimitReached: "Osiągnięto Limit Wiadomości",
			startNewChat: "Rozpocznij Nowy Czat",
			resolutionMessage:
				"Ta rozmowa została rozwiązana przez nasz zespół wsparcia. Dziękujemy za kontakt!",
			escalationConfirmation:
				"Twoje zapytanie zostało przekazane do naszego zespołu wsparcia. Odpowiedzą wkrótce.",
		},
		endChat: {
			title: "Czat Zakończony",
			description: "Dziękujemy za rozmowę. Zapis tej sesji został zapisany w Twojej historii.",
			rateQuality: "Oceń Jakość",
			required: "Wymagane",
			bad: "Źle",
			okay: "W porządku",
			good: "Dobrze",
			great: "Świetnie",
			additionalFeedback: "Dodatkowe uwagi",
			feedbackPlaceholder: "Powiedz nam więcej o swoim doświadczeniu...",
			submitReview: "Wyślij Opinię",
			startNewChat: "Rozpocznij Nowy Czat",
		},
		home: {
			online: "Online",
			humanAgents: "Agenci:",
			available: "Dostępni",
			suggestedActions: "Sugerowane Akcje",
		},
		recentChats: {
			title: "Ostatnie Czaty",
			empty: "Brak ostatnich czatów",
			messages: "wiadomości",
			resolved: "Rozwiązano",
			open: "Otwarty",
		},
		errors: {
			somethingWentWrong: "Przepraszamy, coś poszło nie tak. Spróbuj ponownie.",
			formTimeout: "Przekroczono limit czasu formularza",
			clientHandlerFailed: "Błąd obsługi klienta",
			formSubmissionFailed: "Nie udało się wysłać formularza",
			brandingRequired: "Ten czat wymaga wyświetlania marki Ansa.",
			offlineQueue: "oczekuje. Zostanie wysłane po ponownym połączeniu.",
			messageFailed: "Nie udało się wysłać",
			tapToRetry: "Dotknij, aby spróbować ponownie",
		},
		connection: {
			reconnect: "Połącz ponownie",
			disconnectedTap: "Rozłączono. Dotknij, aby połączyć ponownie.",
		},
		forms: {
			formSubmitted: "Formularz wysłany:",
			customerSatisfactionSurvey: "Ankieta Satysfakcji Klienta",
			satisfactionIntro: "Dziękujemy za kontakt! Chcielibyśmy poznać Twoje doświadczenie.",
			satisfactionDescription: "Pomóż nam ulepszyć naszą usługę",
			satisfactionQuestion: "Jak bardzo jesteś zadowolony z rozwiązania?",
			verySatisfied: "⭐⭐⭐⭐⭐ Bardzo Zadowolony",
			satisfied: "⭐⭐⭐⭐ Zadowolony",
			neutral: "⭐⭐⭐ Neutralny",
			dissatisfied: "⭐⭐ Niezadowolony",
			veryDissatisfied: "⭐ Bardzo Niezadowolony",
			additionalFeedbackOptional: "Dodatkowe uwagi? (opcjonalnie)",
			loadingForm: "Ładowanie formularza...",
			submitting: "Wysyłanie...",
			submitDetails: "Wyślij szczegóły",
			formSubmittedSuccessfully: "Formularz wysłany pomyślnie!",
			cancel: "Anuluj",
			name: "Imię",
			yourName: "Twoje imię",
			nameRequired: "Imię jest wymagane",
			email: "E-mail",
			emailPlaceholder: "ty@przyklad.pl",
			emailRequired: "E-mail jest wymagany",
			message: "Wiadomość",
			howCanWeHelp: "Jak możemy Ci pomóc?",
			messageRequired: "Wiadomość jest wymagana",
			sendMessage: "Wyślij wiadomość",
			thanksWellGetBack: "Dziękujemy! Wkrótce się odezwiemy.",
			somethingWentWrongTryAgain: "Coś poszło nie tak. Spróbuj ponownie.",
		},
		escalation: {
			positiveFeedback: "To odpowiedziało na moje pytanie",
			requestHuman: "Połącz z agentem 👤",
		},
		time: {
			justNow: "Właśnie",
			minutesAgo: "{count}m temu",
			hoursAgo: "{count}g temu",
			yesterday: "Wczoraj",
			daysAgo: "{count}d temu",
			weeksAgo: "{count}tyg temu",
			monthsAgo: "{count}mies temu",
		},
		misc: {
			poweredByAnsa: "Obsługiwane przez Ansa",
		},
		triggers: {
			greeting: "Cześć! 👋",
			startConversation: "Rozpocznij rozmowę",
		},
	},

	sv: {
		header: {
			alwaysOnline: "Alltid online",
			humanAgentConnected: "Mänsklig Agent Ansluten",
		},
		buttons: {
			collapse: "Minimera",
			expand: "Expandera",
			copy: "Kopiera meddelande",
			helpful: "Bra svar",
			notHelpful: "Dåligt svar",
			chatWithUs: "Chatta med oss",
		},
		menu: {
			startNewChat: "Starta ny chatt",
			endChat: "Avsluta chatt",
			viewRecentChats: "Visa senaste chattar",
		},
		chat: {
			thinking: "Tänker",
			seen: "Sedd",
			supportAgent: "Supportagent",
			automated: "Automatiserad",
			conversationResolved: "Konversation Löst",
			rateLimitReached: "Meddelandegräns Nådd",
			startNewChat: "Starta Ny Chatt",
			resolutionMessage:
				"Denna konversation har lösts av vårt supportteam. Tack för att du kontaktade oss!",
			escalationConfirmation:
				"Din förfrågan har vidarebefordrats till vårt mänskliga supportteam. De kommer att svara snart.",
		},
		endChat: {
			title: "Chatt Avslutad",
			description:
				"Tack för att du chattade med oss. En utskrift av denna session har sparats i din historik.",
			rateQuality: "Betygsätt Kvalitet",
			required: "Obligatoriskt",
			bad: "Dålig",
			okay: "Okej",
			good: "Bra",
			great: "Utmärkt",
			additionalFeedback: "Ytterligare Feedback",
			feedbackPlaceholder: "Berätta mer om din upplevelse...",
			submitReview: "Skicka Recension",
			startNewChat: "Starta Ny Chatt",
		},
		home: {
			online: "Online",
			humanAgents: "Mänskliga Agenter:",
			available: "Tillgängliga",
			suggestedActions: "Föreslagna Åtgärder",
		},
		recentChats: {
			title: "Senaste Chattar",
			empty: "Inga senaste chattar",
			messages: "meddelanden",
			resolved: "Löst",
			open: "Öppen",
		},
		errors: {
			somethingWentWrong: "Förlåt, något gick fel. Försök igen.",
			formTimeout: "Formulärhanterare timeout",
			clientHandlerFailed: "Klienthanterare misslyckades",
			formSubmissionFailed: "Kunde inte skicka formulär",
			brandingRequired: "Denna chatt kräver att Ansa-varumärket visas.",
			offlineQueue: "väntande. Skickas vid återanslutning.",
			messageFailed: "Misslyckades att skicka",
			tapToRetry: "Tryck för att försöka igen",
		},
		connection: {
			reconnect: "Återanslut",
			disconnectedTap: "Frånkopplad. Tryck för att återansluta.",
		},
		forms: {
			formSubmitted: "Formulär skickat:",
			customerSatisfactionSurvey: "Kundnöjdhetsundersökning",
			satisfactionIntro: "Tack för att du kontaktade oss! Vi vill gärna höra om din upplevelse.",
			satisfactionDescription: "Hjälp oss förbättra vår service",
			satisfactionQuestion: "Hur nöjd är du med lösningen?",
			verySatisfied: "⭐⭐⭐⭐⭐ Mycket Nöjd",
			satisfied: "⭐⭐⭐⭐ Nöjd",
			neutral: "⭐⭐⭐ Neutral",
			dissatisfied: "⭐⭐ Missnöjd",
			veryDissatisfied: "⭐ Mycket Missnöjd",
			additionalFeedbackOptional: "Ytterligare feedback? (valfritt)",
			loadingForm: "Laddar formulär...",
			submitting: "Skickar...",
			submitDetails: "Skicka detaljer",
			formSubmittedSuccessfully: "Formulär skickat!",
			cancel: "Avbryt",
			name: "Namn",
			yourName: "Ditt namn",
			nameRequired: "Namn krävs",
			email: "E-post",
			emailPlaceholder: "du@exempel.se",
			emailRequired: "E-post krävs",
			message: "Meddelande",
			howCanWeHelp: "Hur kan vi hjälpa dig?",
			messageRequired: "Meddelande krävs",
			sendMessage: "Skicka meddelande",
			thanksWellGetBack: "Tack! Vi hör av oss snart.",
			somethingWentWrongTryAgain: "Något gick fel. Försök igen.",
		},
		escalation: {
			positiveFeedback: "Det besvarade min fråga",
			requestHuman: "Anslut till en agent 👤",
		},
		time: {
			justNow: "Just nu",
			minutesAgo: "{count}m sedan",
			hoursAgo: "{count}t sedan",
			yesterday: "Igår",
			daysAgo: "{count}d sedan",
			weeksAgo: "{count}v sedan",
			monthsAgo: "{count}må sedan",
		},
		misc: {
			poweredByAnsa: "Drivs av Ansa",
		},
		triggers: {
			greeting: "Hej! 👋",
			startConversation: "Starta en konversation",
		},
	},
};

/**
 * Get translations for a specific language with cascade fallback
 *
 * Fallback order: exact match → base language → English
 * Example: "fr-CA" → "fr" → "en"
 *
 * @param lang - Language code (e.g., "fr", "fr-CA", "zh-Hans")
 * @param debug - Whether to log warnings for missing translations
 * @returns TranslationStrings object for the requested language
 */
export function getTranslations(lang: string, debug = false): TranslationStrings {
	const normalizedLang = lang.toLowerCase();

	// 1. Try exact match
	if (translations[normalizedLang]) {
		return translations[normalizedLang];
	}

	// 2. Try base language (e.g., "fr-CA" → "fr")
	const baseLang = normalizedLang.split("-")[0];
	if (translations[baseLang]) {
		if (debug) {
			console.log(`[Ansa] Using base language '${baseLang}' for '${lang}'`);
		}
		return translations[baseLang];
	}

	// 3. Fall back to English
	if (debug) {
		console.warn(`[Ansa] No translation found for '${lang}', falling back to English`);
	}
	return translations.en;
}

/**
 * Get list of all supported language codes
 */
export function getSupportedLanguages(): string[] {
	return Object.keys(translations);
}
