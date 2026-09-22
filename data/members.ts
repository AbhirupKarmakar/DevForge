export interface Member {
    usn: string;
    name: string;
    /** GitHub username only (no URL). Some rows in the source sheet linked a repo instead of a profile — the username segment was kept. */
    github: string | null;
    linkedin: string | null;
}

/**
 * Full first-batch roster (2025 intake — the college's only batch so far),
 * imported from the club's member sheet. GitHub/LinkedIn are as reported
 * by students; missing entries are null, not guessed.
 */
export const members: Member[] = [
    { usn: "2102508703", name: "Abhijit Saha", github: "AbhijitSaha-coder", linkedin: "https://www.linkedin.com/in/abhijit-saha-211621379" },
    { usn: "2102508710", name: "Anant Sharma", github: "anant2526", linkedin: "https://www.linkedin.com/in/anant-sharma-8119b837b" },
    { usn: "2102508727", name: "Bhavesh Sharma", github: "bhavesh-210", linkedin: "https://www.linkedin.com/in/bhavesh-sharma-405831373/" },
    { usn: "2102508741", name: "Dhruv Mehta", github: "dhhhhruv", linkedin: "https://www.linkedin.com/in/dhruv-mehta-3ba4923b2" },
    { usn: "2102508742", name: "Dushyant Acharya", github: "Dotify71", linkedin: "https://www.linkedin.com/in/dushyant-acharya-243205377/" },
    { usn: "2102508748", name: "Geetansh Goyal", github: "geetxnshgoyal", linkedin: "https://www.linkedin.com/in/geetanshgoyal" },
    { usn: "2102508762", name: "Kumari Shristi", github: "Shristibot", linkedin: "https://www.linkedin.com/in/shristishankar" },
    { usn: "2102508765", name: "Luvya Padmaj Rana", github: "luvyarana", linkedin: "https://linkedin.com/in/luvyarana" },
    { usn: "2102508773", name: "Nishtha Agarwal", github: "nishtha-agarwal-211", linkedin: "https://www.linkedin.com/in/nishtha-agarwal-92936a3a7" },
    { usn: "2102508780", name: "Pranav Choudhary", github: "pranavchoudhary-tech", linkedin: "https://www.linkedin.com/in/pranav-choudhary5112" },
    { usn: "2102508783", name: "Prateek Gupta", github: "prateek6789-ai", linkedin: "https://www.linkedin.com/in/prateek-gupta-83513936a/" },
    { usn: "2102508788", name: "Ravi Sharma", github: "ravisharma-09", linkedin: "https://www.linkedin.com/in/ravi-sharma-10b1a1384/" },
    { usn: "2102508794", name: "Sahitya Singh", github: "sahitya0xsingh", linkedin: "https://www.linkedin.com/in/sahitya-singh-7012b137b" },
    { usn: "2102508818", name: "Sujan Y D", github: "sujanyd", linkedin: "https://www.linkedin.com/in/sujan-y-d-6322a437b" },
    { usn: "2102508823", name: "Vikas Sharma", github: "sharmavikas18", linkedin: "https://www.linkedin.com/in/sharmavikas18/" }
];

export const memberStats = {
    total: members.length,
    withGithub: members.filter((m) => m.github).length,
    withLinkedin: members.filter((m) => m.linkedin).length,
};
