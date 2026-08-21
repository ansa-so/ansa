import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[Widget] Uncaught error:", error, info.componentStack);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						height: "100%",
						padding: "24px",
						textAlign: "center",
						fontFamily: "system-ui, sans-serif",
						color: "#6b7280",
						fontSize: "14px",
						gap: "12px",
					}}
				>
					<p>Something went wrong.</p>
					<button
						type="button"
						onClick={() => this.setState({ hasError: false })}
						style={{
							padding: "8px 16px",
							borderRadius: "8px",
							border: "1px solid #e5e7eb",
							background: "white",
							cursor: "pointer",
							fontSize: "13px",
							color: "#374151",
						}}
					>
						Try again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
