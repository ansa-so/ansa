import { describe, expect, it } from "vitest";
import { extractPlainText, stripQuotedText } from "./email-utils";

describe("stripQuotedText", () => {
	it("should return empty string for empty input", () => {
		expect(stripQuotedText("")).toBe("");
	});

	it("should return original text when no quotes present", () => {
		const text = "Hello, this is a simple message.";
		expect(stripQuotedText(text)).toBe(text);
	});

	it("should strip Apple Mail / iOS reply format", () => {
		const text = `C'est cher!

> On Dec 26, 2025, at 10:50 PM, Ansa AI Assistant <agent-8821011a3126@mail.ansa.so> wrote:
>
> 400 euros!
>`;
		expect(stripQuotedText(text)).toBe("C'est cher!");
	});

	it("should strip Gmail reply format", () => {
		const text = `Thanks for the info!

On Thu, Dec 26, 2025 at 10:50 PM Ansa AI <agent@mail.ansa.so> wrote:
> Here is the information you requested.
> Let me know if you need anything else.`;
		expect(stripQuotedText(text)).toBe("Thanks for the info!");
	});

	it("should strip Outlook reply format with separator", () => {
		const text = `Got it, thanks!

-----Original Message-----
From: Ansa AI
Sent: Thursday, December 26, 2025 10:50 PM
Subject: Re: Question

Here is my response.`;
		expect(stripQuotedText(text)).toBe("Got it, thanks!");
	});

	it("should strip Outlook reply format with From:", () => {
		const text = `Understood.

From: support@example.com
Sent: Thursday, December 26, 2025
To: customer@example.com
Subject: Re: Help

Original message here.`;
		expect(stripQuotedText(text)).toBe("Understood.");
	});

	it("should skip inline quoted lines starting with >", () => {
		const text = `I disagree with this:
> Your previous point
But I agree with the rest.`;
		expect(stripQuotedText(text)).toBe("I disagree with this:\nBut I agree with the rest.");
	});

	it("should handle multiline new content before quotes", () => {
		const text = `Line one.
Line two.
Line three.

On Dec 26, 2025, at 10:50 PM, Someone wrote:
> Quoted text here.`;
		expect(stripQuotedText(text)).toBe("Line one.\nLine two.\nLine three.");
	});

	it("should return original text if stripping leaves nothing", () => {
		const text = `> This is all quoted
> Nothing else here`;
		expect(stripQuotedText(text)).toBe(text);
	});

	it("should handle underscore separator (Outlook Web)", () => {
		const text = `My reply here.

________________________________
From: sender@example.com
Sent: Thursday, December 26, 2025
Subject: Re: Topic

Original message.`;
		expect(stripQuotedText(text)).toBe("My reply here.");
	});

	it("should be case-insensitive for On...wrote pattern", () => {
		const text = `Yes!

ON DEC 26, 2025, AT 10:50 PM, SOMEONE WROTE:
> Quoted text`;
		expect(stripQuotedText(text)).toBe("Yes!");
	});
});

describe("extractPlainText", () => {
	it("should extract text from simple HTML", () => {
		const html = "<p>Hello world</p>";
		expect(extractPlainText(html)).toBe("Hello world");
	});

	it("should remove style tags and content", () => {
		const html = "<style>.class { color: red; }</style><p>Content</p>";
		expect(extractPlainText(html)).toBe("Content");
	});

	it("should remove script tags and content", () => {
		const html = "<script>alert('hi');</script><p>Safe content</p>";
		expect(extractPlainText(html)).toBe("Safe content");
	});

	it("should decode HTML entities", () => {
		const html = "<p>Tom &amp; Jerry &lt;3 &quot;cheese&quot;</p>";
		expect(extractPlainText(html)).toBe('Tom & Jerry <3 "cheese"');
	});

	it("should collapse multiple whitespaces", () => {
		const html = "<p>Hello    world</p>  <p>  Test  </p>";
		expect(extractPlainText(html)).toBe("Hello world Test");
	});
});
