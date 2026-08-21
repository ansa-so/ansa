"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "cookie-consent";

export function CookieBanner() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
		if (!consent) {
			setVisible(true);
		}
	}, []);

	function handleAccept() {
		localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
		setVisible(false);
	}

	function handleReject() {
		localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
		setVisible(false);
	}

	if (!visible) return null;

	return (
		<div className="fixed bottom-0 right-0 z-50 p-6">
			<div className="max-w-lg bg-white ring-1 ring-[#D1D1D1] rounded-lg p-5 shadow-lg">
				<div className="flex gap-4 items-start">
					<svg
						width="20"
						height="20"
						viewBox="0 0 18 18"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className="text-[#888] shrink-0 mt-0.5"
						aria-hidden="true"
					>
						<path
							d="M14.8147 9.51665C12.9698 9.02231 11.8348 7.23464 12.0868 5.39001C11.9886 5.37404 11.8907 5.36852 11.7921 5.34212C10.2293 4.92335 9.29597 3.34501 9.6522 1.77988C6.20305 1.46546 2.92566 3.65895 1.99883 7.11793C0.962516 10.9855 3.25778 14.961 7.12535 15.9973C10.9929 17.0336 14.9684 14.7384 16.0048 10.8708C16.1171 10.4516 16.1831 10.0314 16.2197 9.61257C15.7623 9.66601 15.287 9.64321 14.8147 9.51665Z"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M7.0075 5.5H7"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M9.5075 9H9.5"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M5.0075 10H5"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M13.0075 2.75H13"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M15.7575 5.75H15.75"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M9.7575 12.5H9.75"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					<div className="flex-1">
						<p className="text-[#666] text-base mb-3">
							A better experience starts with cookies. We use{" "}
							<Link href="/cookies" className="underline hover:text-[#1A1A1A]">
								cookies
							</Link>{" "}
							to improve our product. Entirely your choice.
						</p>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={handleReject}
								className="inline-flex items-center justify-center rounded font-medium transition-colors cursor-pointer h-8 text-sm px-3 bg-white text-[#1A1A1A] hover:bg-[#F5F5F5] active:bg-[#EBEBEB] border border-[#D1D1D1]"
							>
								Reject
							</button>
							<button
								type="button"
								onClick={handleAccept}
								className="inline-flex items-center justify-center rounded font-medium transition-colors cursor-pointer h-8 text-sm px-3 bg-[#1A1A1A] text-white hover:bg-[#333] active:bg-[#444]"
							>
								Accept
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
