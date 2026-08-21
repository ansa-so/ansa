import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Load .env from project root BEFORE importing db
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const { getDb, triggerTemplates } = await import("@ansa/db");

const triggerTemplatesList = [
	// ============ ENGAGEMENT ============
	{
		slug: "welcome-message",
		name: "Welcome Message",
		description: "Greet visitors after they've been on your site for a few seconds",
		longDescription:
			"Automatically open the chat with a friendly welcome message after a visitor has been browsing for 5 seconds. Great for engaging new visitors and offering assistance.",
		category: "engagement",
		icon: "hand",
		triggerType: "time_on_page",
		conditions: { timeOnPage: 5 },
		actionType: "open_chat",
		actionConfig: {
			message: "👋 Hi there! Welcome to our site. Is there anything I can help you find today?",
		},
		triggerOnce: true,
		isFree: true,
	},
	{
		slug: "scroll-engagement",
		name: "Scroll Engagement",
		description: "Engage visitors who scroll through most of your page",
		longDescription:
			"When a visitor scrolls 80% of a page, they're clearly interested. This trigger opens the chat to offer additional help or resources.",
		category: "engagement",
		icon: "arrow-down",
		triggerType: "scroll_depth",
		conditions: { scrollDepth: 80 },
		actionType: "show_bubble",
		actionConfig: {
			message: "Enjoying the content? Let me know if you have any questions!",
			duration: 6000,
		},
		triggerOnce: true,
		isFree: true,
	},

	// ============ CONVERSION ============
	{
		slug: "exit-intent-offer",
		name: "Exit Intent Offer",
		description: "Catch leaving visitors with a special offer or assistance",
		longDescription:
			"When a visitor moves their mouse towards the browser's close button or address bar, show a bubble offering help or a discount. Great for reducing bounce rates.",
		category: "conversion",
		icon: "log-out",
		triggerType: "exit_intent",
		conditions: {},
		actionType: "show_bubble",
		actionConfig: {
			message: "Wait! Before you go, can I help you find what you're looking for?",
			duration: 8000,
		},
		triggerOnce: true,
		isFree: true,
	},
	{
		slug: "pricing-page-help",
		name: "Pricing Page Assistance",
		description: "Offer help to visitors viewing your pricing page",
		longDescription:
			"When a visitor spends 30 seconds on your pricing page, proactively offer to answer questions about plans and pricing. Helps convert hesitant buyers.",
		category: "conversion",
		icon: "dollar-sign",
		triggerType: "time_on_page",
		conditions: { timeOnPage: 30, page: "/pricing*" },
		actionType: "open_chat",
		actionConfig: {
			message:
				"I see you're checking out our pricing. Do you have any questions about our plans? I'm happy to help!",
		},
		triggerOnce: true,
		isFree: true,
	},

	// ============ E-COMMERCE ============
	{
		slug: "product-page-assistant",
		name: "Product Page Assistant",
		description: "Help visitors browsing product pages",
		longDescription:
			"After a visitor spends 45 seconds on a product page, offer assistance. They might have questions about the product, shipping, or need help deciding.",
		category: "ecommerce",
		icon: "shopping-bag",
		triggerType: "time_on_page",
		conditions: { timeOnPage: 45, page: "/products/*" },
		actionType: "open_chat",
		actionConfig: {
			message:
				"Hi! I noticed you're looking at this product. Do you have any questions I can help with?",
		},
		triggerOnce: true,
		isFree: true,
	},
	{
		slug: "back-in-stock-trigger",
		name: "Back in Stock Notification",
		description: "Offer stock notifications for out-of-stock products",
		longDescription:
			"When a visitor views an out-of-stock product, automatically offer to notify them when it's back. Captures leads and improves customer experience.",
		category: "ecommerce",
		icon: "bell",
		triggerType: "custom_event",
		conditions: { event: "product_view", eventData: { inStock: false } },
		actionType: "show_form",
		actionConfig: {
			message:
				"This item is currently out of stock. Would you like me to notify you when it's available again?",
		},
		formTemplateSlug: "back-in-stock-form",
		triggerOnce: true,
		isFree: true,
	},
	{
		slug: "cart-abandonment",
		name: "Cart Abandonment Recovery",
		description: "Engage visitors about to leave with items in cart",
		longDescription:
			"When a visitor with items in their cart shows exit intent, offer assistance or a discount to complete their purchase.",
		category: "ecommerce",
		icon: "shopping-cart",
		triggerType: "exit_intent",
		conditions: { event: "cart_state", eventData: { hasItems: true } },
		actionType: "open_chat",
		actionConfig: {
			message:
				"I noticed you have items in your cart. Is there anything I can help with to complete your order?",
		},
		triggerOnce: true,
		isFree: true,
	},
	{
		slug: "checkout-assistance",
		name: "Checkout Assistance",
		description: "Offer help during the checkout process",
		longDescription:
			"When a visitor reaches the checkout page, proactively offer assistance with shipping, payment, or any questions they might have.",
		category: "ecommerce",
		icon: "credit-card",
		triggerType: "page_view",
		conditions: { page: "/checkout*" },
		actionType: "show_bubble",
		actionConfig: {
			message: "Need help checking out? I'm here if you have questions about shipping or payment.",
			duration: 5000,
		},
		triggerOnce: true,
		isFree: true,
	},

	// ============ LEAD GENERATION ============
	{
		slug: "blog-newsletter",
		name: "Blog Newsletter Signup",
		description: "Capture readers who engage with your blog content",
		longDescription:
			"When a visitor reads 60+ seconds of a blog post, they're engaged with your content. Offer them a newsletter signup to stay updated.",
		category: "lead-generation",
		icon: "mail",
		triggerType: "time_on_page",
		conditions: { timeOnPage: 60, page: "/blog/*" },
		actionType: "show_form",
		actionConfig: {
			message:
				"Enjoying this article? Subscribe to get more content like this delivered to your inbox!",
		},
		formTemplateSlug: "newsletter-signup-form",
		triggerOnce: true,
		isFree: true,
	},
	{
		slug: "demo-request-trigger",
		name: "Demo Request Prompt",
		description: "Encourage demo requests on key pages",
		longDescription:
			"After visitors spend significant time on your features or product pages, offer them a personalized demo to see the product in action.",
		category: "lead-generation",
		icon: "play-circle",
		triggerType: "time_on_page",
		conditions: { timeOnPage: 45, page: "/features*" },
		actionType: "show_form",
		actionConfig: {
			message: "Would you like to see our product in action? Book a free demo with our team!",
		},
		formTemplateSlug: "book-demo-form",
		triggerOnce: true,
		isFree: true,
	},
	{
		slug: "contact-us-prompt",
		name: "Contact Us Prompt",
		description: "Encourage visitors to reach out on the contact page",
		longDescription:
			"When someone visits your contact page, proactively offer the contact form to make it easy for them to get in touch.",
		category: "lead-generation",
		icon: "message-circle",
		triggerType: "page_view",
		conditions: { page: "/contact*" },
		actionType: "show_form",
		actionConfig: {
			message:
				"Looking to get in touch? Fill out this quick form and we'll get back to you shortly!",
		},
		formTemplateSlug: "contact-form",
		triggerOnce: true,
		isFree: true,
	},

	// ============ SUPPORT ============
	{
		slug: "faq-assistance",
		name: "FAQ Page Assistance",
		description: "Offer additional help on FAQ pages",
		longDescription:
			"If someone is browsing your FAQ for a while, they might not have found their answer. Offer to help them directly.",
		category: "support",
		icon: "help-circle",
		triggerType: "time_on_page",
		conditions: { timeOnPage: 30, page: "/faq*" },
		actionType: "open_chat",
		actionConfig: {
			message: "Can't find what you're looking for? I'm here to help answer any questions!",
		},
		triggerOnce: true,
		isFree: true,
	},
	{
		slug: "documentation-help",
		name: "Documentation Helper",
		description: "Assist users browsing documentation",
		longDescription:
			"When users spend time in your docs, offer assistance. They might be stuck or need clarification on something.",
		category: "support",
		icon: "book-open",
		triggerType: "time_on_page",
		conditions: { timeOnPage: 60, page: "/docs/*" },
		actionType: "show_bubble",
		actionConfig: {
			message: "Need help understanding something? Ask me anything about the docs!",
			duration: 7000,
		},
		triggerOnce: true,
		isFree: true,
	},

	// ============ FEEDBACK ============
	{
		slug: "post-purchase-feedback",
		name: "Post-Purchase Feedback",
		description: "Collect feedback after a purchase",
		longDescription:
			"After a customer completes a purchase, ask for feedback about their shopping experience while it's fresh in their mind.",
		category: "feedback",
		icon: "star",
		triggerType: "page_view",
		conditions: { page: "/order-confirmation*" },
		actionType: "show_form",
		actionConfig: {
			message: "Thanks for your order! We'd love to hear about your shopping experience.",
		},
		formTemplateSlug: "feedback-form",
		triggerOnce: true,
		isFree: true,
	},
	{
		slug: "nps-survey-trigger",
		name: "NPS Survey",
		description: "Measure customer loyalty with NPS",
		longDescription:
			"Ask returning visitors how likely they are to recommend you. A great way to measure customer satisfaction over time.",
		category: "feedback",
		icon: "trending-up",
		triggerType: "custom_event",
		conditions: { event: "returning_visitor", eventData: { visitCount: 3 } },
		actionType: "show_form",
		actionConfig: {
			message: "We'd love your feedback! How likely are you to recommend us to a friend?",
		},
		formTemplateSlug: "nps-survey-form",
		triggerOnce: true,
		isFree: true,
	},
];

async function seedTriggerTemplates() {
	const db = getDb();

	// Check for category filter
	const categoryFilter = process.argv[2];
	const templatesToSeed = categoryFilter
		? triggerTemplatesList.filter((t) => t.category === categoryFilter)
		: triggerTemplatesList;

	console.log(
		categoryFilter
			? `Seeding ${templatesToSeed.length} trigger templates in category: ${categoryFilter}...`
			: `Seeding all ${templatesToSeed.length} trigger templates...`,
	);

	for (const template of templatesToSeed) {
		try {
			await db
				.insert(triggerTemplates)
				.values(template)
				.onConflictDoUpdate({
					target: triggerTemplates.slug,
					set: {
						name: template.name,
						description: template.description,
						longDescription: template.longDescription,
						category: template.category,
						icon: template.icon,
						triggerType: template.triggerType,
						conditions: template.conditions,
						actionType: template.actionType,
						actionConfig: template.actionConfig,
						formTemplateSlug: template.formTemplateSlug,
						triggerOnce: template.triggerOnce,
						isFree: template.isFree,
						updatedAt: new Date(),
					},
				});
			console.log(`✓ ${template.name}`);
		} catch (error) {
			console.error(`✗ Failed to add ${template.name}:`, error);
		}
	}

	console.log("\n✅ Trigger template seeding complete!");
	process.exit(0);
}

seedTriggerTemplates();
