import { useState } from "react";

// Token types for syntax highlighting
type TokenType =
	| "keyword"
	| "string"
	| "comment"
	| "number"
	| "function"
	| "operator"
	| "punctuation"
	| "property"
	| "tag"
	| "attribute"
	| "variable"
	| "builtin"
	| "plain";

interface Token {
	type: TokenType;
	value: string;
}

// Language-specific tokenization patterns
const LANGUAGE_PATTERNS: Record<string, { patterns: Array<{ type: TokenType; regex: RegExp }> }> = {
	javascript: {
		patterns: [
			{ type: "comment", regex: /^(\/\/.*|\/\*[\s\S]*?\*\/)/ },
			{
				type: "string",
				regex: /^("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)/,
			},
			{
				type: "keyword",
				regex:
					/^(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|async|await|class|extends|new|this|super|import|export|default|from|as|typeof|instanceof|in|of|void|delete|null|undefined|true|false)\b/,
			},
			{
				type: "builtin",
				regex:
					/^(console|Math|Array|Object|String|Number|Boolean|Date|JSON|Promise|Map|Set|WeakMap|WeakSet|Symbol|BigInt|RegExp|Error|TypeError|ReferenceError|SyntaxError)\b/,
			},
			{ type: "function", regex: /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/ },
			{ type: "number", regex: /^(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?)\b/ },
			{
				type: "operator",
				regex:
					/^(===|!==|==|!=|<=|>=|&&|\|\||=>|\+=|-=|\*=|\/=|%=|\+\+|--|\+|-|\*|\/|%|<|>|!|&|\||\^|~|<<|>>|>>>|=|\?|:)/,
			},
			{ type: "punctuation", regex: /^[{}[\]();,.]/ },
			{ type: "property", regex: /^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*:)/ },
			{ type: "variable", regex: /^[a-zA-Z_$][a-zA-Z0-9_$]*/ },
		],
	},
	typescript: {
		patterns: [
			{ type: "comment", regex: /^(\/\/.*|\/\*[\s\S]*?\*\/)/ },
			{
				type: "string",
				regex: /^("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`)/,
			},
			{
				type: "keyword",
				regex:
					/^(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|async|await|class|extends|new|this|super|import|export|default|from|as|typeof|instanceof|in|of|void|delete|null|undefined|true|false|interface|type|enum|implements|private|protected|public|static|readonly|abstract|declare|namespace|module|keyof|infer|never|unknown|any)\b/,
			},
			{
				type: "builtin",
				regex:
					/^(console|Math|Array|Object|String|Number|Boolean|Date|JSON|Promise|Map|Set|WeakMap|WeakSet|Symbol|BigInt|RegExp|Error|TypeError|ReferenceError|SyntaxError|Partial|Required|Readonly|Pick|Omit|Record|Exclude|Extract|NonNullable|ReturnType|Parameters|InstanceType)\b/,
			},
			{ type: "function", regex: /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/ },
			{ type: "number", regex: /^(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?)\b/ },
			{
				type: "operator",
				regex:
					/^(===|!==|==|!=|<=|>=|&&|\|\||=>|\+=|-=|\*=|\/=|%=|\+\+|--|\+|-|\*|\/|%|<|>|!|&|\||\^|~|<<|>>|>>>|=|\?|:)/,
			},
			{ type: "punctuation", regex: /^[{}[\]();,.]/ },
			{ type: "property", regex: /^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*:)/ },
			{ type: "variable", regex: /^[a-zA-Z_$][a-zA-Z0-9_$]*/ },
		],
	},
	json: {
		patterns: [
			{ type: "string", regex: /^"[^"\\]*(?:\\.[^"\\]*)*"/ },
			{ type: "number", regex: /^-?\d+\.?\d*(?:e[+-]?\d+)?/ },
			{ type: "keyword", regex: /^(true|false|null)\b/ },
			{ type: "punctuation", regex: /^[{}[\]:,]/ },
		],
	},
	python: {
		patterns: [
			{ type: "comment", regex: /^#.*/ },
			{
				type: "string",
				regex: /^("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/,
			},
			{
				type: "keyword",
				regex:
					/^(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|True|False|None)\b/,
			},
			{
				type: "builtin",
				regex:
					/^(print|len|range|str|int|float|list|dict|set|tuple|bool|type|isinstance|hasattr|getattr|setattr|open|input|map|filter|zip|enumerate|sorted|reversed|sum|min|max|abs|round|all|any)\b/,
			},
			{ type: "function", regex: /^([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/ },
			{ type: "number", regex: /^(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?j?)\b/ },
			{
				type: "operator",
				regex:
					/^(==|!=|<=|>=|<>|<<|>>|\*\*|\/\/|:=|\+=|-=|\*=|\/=|%=|@=|&=|\|=|\^=|<<=|>>=|\*\*=|\/\/=|\+|-|\*|\/|%|@|<|>|&|\||\^|~|=)/,
			},
			{ type: "punctuation", regex: /^[{}[\]();:,.]/ },
			{ type: "variable", regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
		],
	},
	html: {
		patterns: [
			{ type: "comment", regex: /^<!--[\s\S]*?-->/ },
			{ type: "tag", regex: /^(<\/?[a-zA-Z][a-zA-Z0-9-]*|\/?>)/ },
			{ type: "attribute", regex: /^([a-zA-Z][a-zA-Z0-9-]*)(?==)/ },
			{ type: "string", regex: /^("[^"]*"|'[^']*')/ },
			{ type: "operator", regex: /^=/ },
		],
	},
	css: {
		patterns: [
			{ type: "comment", regex: /^\/\*[\s\S]*?\*\// },
			{ type: "string", regex: /^("[^"]*"|'[^']*')/ },
			{
				type: "keyword",
				regex: /^(@media|@import|@keyframes|@font-face|@supports|@charset|!important)\b/,
			},
			{ type: "property", regex: /^([a-zA-Z-]+)(?=\s*:)/ },
			{ type: "number", regex: /^-?\d+\.?\d*(px|em|rem|%|vh|vw|vmin|vmax|deg|rad|s|ms|fr)?/ },
			{
				type: "builtin",
				regex:
					/^(#[0-9a-fA-F]{3,8}|rgb|rgba|hsl|hsla|url|calc|var|linear-gradient|radial-gradient)\b/,
			},
			{ type: "punctuation", regex: /^[{}();:,.]/ },
			{ type: "variable", regex: /^--[a-zA-Z][a-zA-Z0-9-]*/ },
			{ type: "tag", regex: /^[a-zA-Z][a-zA-Z0-9-]*/ },
		],
	},
	sql: {
		patterns: [
			{ type: "comment", regex: /^(--.*|\/\*[\s\S]*?\*\/)/ },
			{ type: "string", regex: /^('[^']*'|"[^"]*")/ },
			{
				type: "keyword",
				regex:
					/^(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|ON|AND|OR|NOT|IN|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|VIEW|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|DEFAULT|CONSTRAINT|CASCADE|DISTINCT|COUNT|SUM|AVG|MIN|MAX|BETWEEN|LIKE|CASE|WHEN|THEN|ELSE|END|UNION|ALL|EXISTS|ASC|DESC|TRUNCATE|DATABASE|SCHEMA|IF|BEGIN|COMMIT|ROLLBACK|TRANSACTION)\b/i,
			},
			{
				type: "builtin",
				regex:
					/^(INT|INTEGER|BIGINT|SMALLINT|TINYINT|DECIMAL|NUMERIC|FLOAT|REAL|DOUBLE|BOOLEAN|BOOL|CHAR|VARCHAR|TEXT|DATE|TIME|DATETIME|TIMESTAMP|BLOB|JSON|UUID|SERIAL)\b/i,
			},
			{ type: "number", regex: /^-?\d+\.?\d*/ },
			{ type: "operator", regex: /^(<=|>=|<>|!=|=|<|>|\+|-|\*|\/|%)/ },
			{ type: "punctuation", regex: /^[{}[\]();,.*]/ },
			{ type: "variable", regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
		],
	},
	bash: {
		patterns: [
			{ type: "comment", regex: /^#.*/ },
			{ type: "string", regex: /^("[^"]*"|'[^']*'|\$"[^"]*"|\$'[^']*')/ },
			{
				type: "keyword",
				regex:
					/^(if|then|else|elif|fi|case|esac|for|while|until|do|done|in|function|select|time|coproc|return|exit|break|continue|declare|local|export|readonly|typeset|unset|shift|source)\b/,
			},
			{
				type: "builtin",
				regex:
					/^(echo|printf|read|cd|pwd|ls|cat|grep|sed|awk|find|xargs|sort|uniq|wc|head|tail|cut|tr|tee|diff|patch|chmod|chown|mkdir|rmdir|rm|cp|mv|ln|touch|test|expr|eval|exec|trap|wait|kill|jobs|bg|fg|alias|unalias|set|env|which|whereis|man|help|sudo|apt|yum|brew|npm|yarn|git|docker|curl|wget)\b/,
			},
			{ type: "variable", regex: /^\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?|\$[0-9@#?$!*-]/ },
			{ type: "number", regex: /^-?\d+/ },
			{ type: "operator", regex: /^(&&|\|\||;;|<<|>>|[|&;><])/ },
			{ type: "punctuation", regex: /^[{}[\]();]/ },
		],
	},
	shell: {
		patterns: [
			{ type: "comment", regex: /^#.*/ },
			{ type: "string", regex: /^("[^"]*"|'[^']*')/ },
			{
				type: "keyword",
				regex:
					/^(if|then|else|elif|fi|case|esac|for|while|until|do|done|in|function|return|exit|break|continue|export)\b/,
			},
			{
				type: "builtin",
				regex:
					/^(echo|printf|read|cd|pwd|ls|cat|grep|sed|awk|find|xargs|sort|uniq|wc|head|tail|cut|tr|tee|diff|chmod|chown|mkdir|rmdir|rm|cp|mv|ln|touch|test|expr|eval|exec|trap|wait|kill|sudo|npm|yarn|pnpm|git|docker|curl|wget)\b/,
			},
			{ type: "variable", regex: /^\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?|\$[0-9@#?$!*-]/ },
			{ type: "number", regex: /^-?\d+/ },
			{ type: "operator", regex: /^(&&|\|\||;;|<<|>>|[|&;><])/ },
			{ type: "punctuation", regex: /^[{}[\]();]/ },
		],
	},
};

// Alias mappings for common language names
const LANGUAGE_ALIASES: Record<string, string> = {
	js: "javascript",
	jsx: "javascript",
	ts: "typescript",
	tsx: "typescript",
	py: "python",
	sh: "bash",
	zsh: "bash",
	fish: "bash",
	powershell: "bash",
	ps1: "bash",
	cmd: "bash",
	batch: "bash",
	htm: "html",
	xml: "html",
	svg: "html",
	scss: "css",
	sass: "css",
	less: "css",
	mysql: "sql",
	postgresql: "sql",
	postgres: "sql",
	sqlite: "sql",
	jsonc: "json",
};

// Get token colors based on theme
function getTokenColor(type: TokenType, isDark: boolean): string {
	const colors: Record<TokenType, { dark: string; light: string }> = {
		keyword: { dark: "#c792ea", light: "#7c3aed" },
		string: { dark: "#c3e88d", light: "#16a34a" },
		comment: { dark: "#697098", light: "#6b7280" },
		number: { dark: "#f78c6c", light: "#dc2626" },
		function: { dark: "#82aaff", light: "#2563eb" },
		operator: { dark: "#89ddff", light: "#0891b2" },
		punctuation: { dark: "#89ddff", light: "#64748b" },
		property: { dark: "#f07178", light: "#be185d" },
		tag: { dark: "#f07178", light: "#dc2626" },
		attribute: { dark: "#ffcb6b", light: "#d97706" },
		variable: { dark: "#ffcb6b", light: "#d97706" },
		builtin: { dark: "#ffcb6b", light: "#d97706" },
		plain: { dark: "#d4d4d4", light: "#1f2937" },
	};
	return isDark ? colors[type].dark : colors[type].light;
}

// Tokenize code based on language
function tokenize(code: string, language: string): Token[] {
	const normalizedLang = LANGUAGE_ALIASES[language.toLowerCase()] || language.toLowerCase();
	const langPatterns = LANGUAGE_PATTERNS[normalizedLang];

	if (!langPatterns) {
		// Fallback: return as plain text
		return [{ type: "plain", value: code }];
	}

	const tokens: Token[] = [];
	let remaining = code;

	while (remaining.length > 0) {
		let matched = false;

		// Handle whitespace
		const whitespaceMatch = remaining.match(/^(\s+)/);
		if (whitespaceMatch) {
			tokens.push({ type: "plain", value: whitespaceMatch[1] });
			remaining = remaining.slice(whitespaceMatch[1].length);
			continue;
		}

		// Try each pattern
		for (const { type, regex } of langPatterns.patterns) {
			const match = remaining.match(regex);
			if (match) {
				tokens.push({ type, value: match[0] });
				remaining = remaining.slice(match[0].length);
				matched = true;
				break;
			}
		}

		// If no pattern matched, consume one character as plain text
		if (!matched) {
			tokens.push({ type: "plain", value: remaining[0] });
			remaining = remaining.slice(1);
		}
	}

	return tokens;
}

// Copy icon SVG
function CopyIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
	);
}

// Check icon SVG
function CheckIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

interface CodeBlockProps {
	code: string;
	language?: string;
	isDark: boolean;
}

export function CodeBlock({ code, language = "", isDark }: CodeBlockProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback for older browsers
			const textArea = document.createElement("textarea");
			textArea.value = code;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand("copy");
			document.body.removeChild(textArea);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const tokens = tokenize(code, language);

	return (
		<div
			style={{
				position: "relative",
				margin: "8px 0",
			}}
		>
			{/* Language label & Copy button */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
					padding: "6px 12px",
					borderTopLeftRadius: "6px",
					borderTopRightRadius: "6px",
					fontSize: "12px",
					color: isDark ? "#94a3b8" : "#64748b",
				}}
			>
				<span>{language || "code"}</span>
				<button
					type="button"
					onClick={handleCopy}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "4px",
						background: "none",
						border: "none",
						cursor: "pointer",
						color: copied ? (isDark ? "#4ade80" : "#16a34a") : isDark ? "#94a3b8" : "#64748b",
						padding: "2px 6px",
						borderRadius: "4px",
						fontSize: "12px",
						transition: "color 0.2s",
					}}
					onMouseEnter={(e) => {
						if (!copied) {
							e.currentTarget.style.color = isDark ? "#e2e8f0" : "#1f2937";
						}
					}}
					onMouseLeave={(e) => {
						if (!copied) {
							e.currentTarget.style.color = isDark ? "#94a3b8" : "#64748b";
						}
					}}
				>
					{copied ? <CheckIcon /> : <CopyIcon />}
					{copied ? "Copied!" : "Copy"}
				</button>
			</div>

			{/* Code content */}
			<pre
				style={{
					backgroundColor: isDark ? "#0f172a" : "#f8fafc",
					padding: "12px",
					borderBottomLeftRadius: "6px",
					borderBottomRightRadius: "6px",
					overflow: "auto",
					fontSize: "13px",
					lineHeight: "1.5",
					margin: 0,
					fontFamily:
						'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
				}}
			>
				<code>
					{tokens.map((token, index) => (
						<span
							key={index}
							style={{
								color: getTokenColor(token.type, isDark),
							}}
						>
							{token.value}
						</span>
					))}
				</code>
			</pre>
		</div>
	);
}

export default CodeBlock;
