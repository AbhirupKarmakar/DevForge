/**
 * DevForge Executive Council, the founding governance office bearers.
 * Source of truth for the public /club About page and for assigning council
 * titles to member records (scripts/set-council.ts). Order is the governance
 * hierarchy: President first.
 *
 * `usn` links to the member's account. `github` gives a public avatar for the
 * marketing page (the member-photo endpoint is auth-gated, so a public page
 * can't use it). Emails are the official @devforge.club council addresses.
 */
export interface CouncilMember {
    position: string;
    name: string;
    usn: string;
    email: string;
    github: string;
    /** One line on what the role owns, from the governance document. */
    remit: string;
}

export const council: CouncilMember[] = [
    {
        position: "President",
        name: "Geetansh Goyal",
        usn: "2102508748",
        email: "geetansh@devforge.club",
        github: "geetxnshgoyal",
        remit: "Overall vision, strategy, and direction of DevForge.",
    },
    {
        position: "Vice President",
        name: "Vikas Sharma",
        usn: "2102508823",
        email: "vikas@devforge.club",
        github: "sharmavikas18",
        remit: "Supports the President and coordinates club operations.",
    },
    {
        position: "General Secretary",
        name: "Dhruv Mehta",
        usn: "2102508741",
        email: "dhruv@devforge.club",
        github: "dhhhhruv",
        remit: "Governance, documentation, and internal communication.",
    },
    {
        position: "Treasurer",
        name: "Bhavesh Sharma",
        usn: "2102508727",
        email: "bhavesh@devforge.club",
        github: "bhavesh-210",
        remit: "Budgeting, financial records, and sponsorship funds.",
    },
    {
        position: "Membership Lead",
        name: "Nishtha Agarwal",
        usn: "2102508773",
        email: "nishtha@devforge.club",
        github: "nishtha-agarwal-211",
        remit: "Applications, onboarding, and member experience.",
    },
    {
        position: "Technical Lead",
        name: "Luvya Padmaj Rana",
        usn: "2102508765",
        email: "luvya@devforge.club",
        github: "luvyarana",
        remit: "Workshops, technical projects, and infrastructure.",
    },
    {
        position: "Community Lead",
        name: "Sahitya Singh",
        usn: "2102508794",
        email: "sahitya@devforge.club",
        github: "sahitya0xsingh",
        remit: "Community engagement, spaces, and networking.",
    },
    {
        position: "Marketing Lead",
        name: "Anant Sharma",
        usn: "2102508710",
        email: "anant@devforge.club",
        github: "anant2526",
        remit: "Branding, outreach, and event publicity.",
    },
];
