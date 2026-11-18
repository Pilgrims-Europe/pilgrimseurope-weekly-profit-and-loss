/** App title — displayed in the header and browser tab */
export const APP_TITLE = "Weekly P&L";

/** Path to the app icon in /public (favicon and manifest icon) */
export const LOGO_SRC = '/icon.svg';

/**
 * The Pilgrim's logo in the header. Put the PNG at public/pilgrims-logo.png (the same file the
 * Travel Expense Dashboard uses). Until the file is there, the header shows a text wordmark.
 */
export const PILGRIMS_LOGO = '/pilgrims-logo.png';

/** GitHub repo, for ticket links (#20, #21, #22) on lines with an open rule. */
export const REPO_URL = 'https://github.com/Pilgrims-Europe/pilgrimseurope-weekly-profit-and-loss';

/**
 * Pages, in tab order. `description` is the tab tooltip and the subtitle in the header.
 * The ⌘K palette lists the same pages.
 */
export const NAV_ITEMS: { label: string; href: string; description: string }[] = [
  {
    label: 'Weekly P&L',
    href: '/',
    description: 'The Anaplan weekly template for one pilot site and week, with the RAG and rule of each line',
  },
  {
    label: 'Week by week',
    href: '/week-by-week',
    description: 'The Anaplan weekly template week by week, for MTD, QTD, YTD or the Last 12 Months',
  },
  {
    label: 'Sales margin',
    href: '/sales-margin',
    description: 'G.S.V. to Contribution, with price and cost per kg, week by week, with the RAG of each line',
  },
  { label: 'Trend', href: '/trend', description: 'One line over the last 13 weeks' },
  {
    label: 'Kill',
    href: '/kill',
    description: 'Kill (poultry) and Kill (pork) by kill site and day, with condemnation detail',
  },
  {
    label: 'Lines and rules',
    href: '/lines',
    description: 'Every template line: source, RAG, the reason for the RAG and the rule this build uses',
  },
  {
    label: 'Data and quality',
    href: '/quality',
    description: 'Data freshness, GL accounts that no line uses, and the open rules',
  },
];
