import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("data");
const jsonPath = path.join(dataDir, "seed-data.json");
const jsPath = path.join(dataDir, "seed-data.js");

const documentSummary = [
  "This form term sheet is a high-level summary for a blind-pool venture capital or private equity fund.",
  "It covers fund formation, investor eligibility, management authority, sponsor commitment, fees, LPAC governance, fund life, capital calls, investment limitations, distributions, expenses, co-investments, additional vehicles, transfer restrictions, indemnification, ERISA, tax treatment, and risk disclosures.",
  "The form intentionally preserves bracketed alternatives and blanks for business decisions such as fund size, investment strategy, commitment minimums, closings, management fee mechanics, investment period, term extensions, consent thresholds, borrowing limits, and economics.",
  "For the Orrick review workflow, the highest-friction drafting areas are the blind-pool strategy description, sponsor/GP structure, CarryCo mechanics, management fee and offset elections, capital call and default remedies, warehoused securities, distribution waterfall and in-kind distributions, clawback/giveback obligations, successor fund limits, and side-letter/vehicle flexibility."
].join(" ");

const openItemsSummary = [
  "The open-items memo converts the form term sheet into a drafting checklist for a new blind-pool fund.",
  "It identifies business elections, legal drafting choices, follow-up questions, and supporting documents needed before the term sheet can be finalized.",
  "The memo is the source for the work queue and should be used alongside the term-sheet section summaries when resolving each item."
].join(" ");

const sectionSummaries = {
  "sec-00-fund": "Introduces the fund-formation section of the term sheet.",
  "sec-01-the-fund": "Identifies the fund as a Delaware limited partnership and leaves the fund name to be completed.",
  "sec-02-the-fund-agreement": "Defines the governing limited partnership agreement and confirms it may be amended, restated, or modified.",
  "sec-03-investment-objectives-and-program": "Describes the fund's target strategy as private VC/PE-style investments, with bracketed choices for asset type, stage, portfolio company terminology, and target fields.",
  "sec-04-capital-commitments": "Sets the target fund size, maximum aggregate commitments, investor minimum commitment, GP discretion to accept smaller subscriptions, and optional sponsor commitment treatment.",
  "sec-05-closings": "Establishes the Initial Closing mechanics, later closings, increased commitments, and the deadline for admitting additional capital.",
  "sec-06-investor-qualifications": "Limits fund interests to accredited investors and describes securities-law, Investment Company Act, and transfer restrictions.",
  "sec-07-management": "Introduces the management section of the term sheet.",
  "sec-08-management": "Names the General Partner, permits use of a Management Company, and states that limited partners do not manage or vote except as provided by law or the fund agreement.",
  "sec-09-sponsor-capital-commitment": "Sets the expected GP/affiliate commitment percentage and leaves open whether that commitment may be cash, cashless contributions, warehoused securities, promissory notes, or a combination.",
  "sec-10-management-fee": "Defines the management fee rate, payment timing, fee base, post-investment-period stepdown options, limited-operations adjustments, and offsets for certain expenses or events.",
  "sec-11-management-fee-offset": "Provides optional language requiring portfolio-company transaction or monitoring fees received by the GP or management company to offset future management fees.",
  "sec-12-limited-partner-advisory-committee": "Creates an LPAC framework, including member count, appointment mechanics, conflict approvals, advisory role, and limits on fiduciary or management obligations.",
  "sec-13-fund-lifecycle": "Introduces the fund lifecycle section covering investment period, term, dissolution, key person, and GP removal.",
  "sec-14-investment-period": "Defines the investment period by anniversary, termination event, or limited-operations mode, with bracketed choices for timing and triggering dates.",
  "sec-15-term": "Sets the fund term and extension rights, including whether GP discretion, LPAC approval, or limited partner approval is required.",
  "sec-16-dissolution": "Lists dissolution triggers, including term expiration, GP election, loss of limited partners, judicial dissolution, GP cessation, and optional partner-consent events.",
  "sec-17-time-commitment-key-person-event": "Identifies key persons and describes their time commitment, key-person event triggers, and possible consequences for investment activity.",
  "sec-18-removal-of-the-general-partner": "Allows limited partners to remove the GP for cause and sets potential carried-interest reduction percentages and cause standards.",
  "sec-19-operations-and-economics": "Introduces the operational and economic terms section.",
  "sec-20-investment-limitations": "Lists transactions and activities requiring LPAC or limited partner consent, especially affiliate transactions, concentration limits, successor funds, and related-party arrangements.",
  "sec-21-capital-contributions": "Describes capital-call mechanics, optional initial contribution percentage, notice period, GP discretion over call amounts, and interest on overdue contributions.",
  "sec-22-failure-to-make-capital-contributions": "Provides that defaulting limited partners may face penalties determined by the GP under the fund agreement and applicable law.",
  "sec-23-warehoused-securities": "Permits the fund to acquire pre-closing warehoused investments from the GP or affiliates at cost plus related expenses, if this optional provision is retained.",
  "sec-24-distributions": "Gives the GP discretion over timing and form of distributions, permits reserves, and outlines allocation of current income and disposition proceeds.",
  "sec-25-in-kind-distributions": "Allows distributions in cash or marketable securities during the term and non-marketable securities at dissolution.",
  "sec-26-general-partner-clawback": "Requires the GP to return excess carried interest at wind-up so each limited partner receives the intended net economic result.",
  "sec-27-fund-expenses": "Allocates broad formation, operating, investment, regulatory, tax, audit, reporting, indemnity, and dissolution expenses to the fund.",
  "sec-28-general-partner-expenses": "States that the GP and management company bear routine overhead and certain adviser-compliance or investment-sourcing costs, subject to bracketed choices.",
  "sec-29-other-competitive-activity-successor-fund": "Allows the GP and affiliates to sponsor or support other vehicles while restricting successor blind-pool fundraising during the investment period unless specified conditions are met.",
  "sec-30-borrowing": "Authorizes fund borrowing or guarantees subject to the fund agreement and a bracketed cap tied to commitments or uncalled commitments.",
  "sec-31-reports": "Lists regular investor reporting, including quarterly unaudited statements, capital accounts, annual financials, tax information, and other fund-agreement reports.",
  "sec-32-valuation": "Requires GP valuation of fund assets in good faith under alternative-investment industry standards, including for financial statements and in-kind distributions.",
  "sec-33-transfers-of-interests-and-withdrawals": "Emphasizes illiquidity and restricts transfers, pledges, and withdrawals except as permitted by the fund agreement and GP consent.",
  "sec-34-co-investment-opportunities": "Permits but does not require the GP to offer co-investment opportunities and to form co-investment vehicles with flexible terms and fees.",
  "sec-35-additional-vehicles": "Introduces the additional-vehicles section.",
  "sec-36-holding-vehicles-feeder-vehicle-alternative-investment-vehicles-parall": "Authorizes holding, feeder, alternative investment, parallel, and subsidiary vehicles to address tax, regulatory, accounting, business, or investor-specific constraints.",
  "sec-37-legal-miscellaneous": "Introduces the legal, tax, ERISA, amendment, side-letter, and risk sections.",
  "sec-38-exculpation-and-indemnification": "Provides broad exculpation and indemnification for covered persons absent material misconduct, with indemnity funded by the fund.",
  "sec-39-limited-partner-giveback": "Allows the GP to require limited partners to return prior distributions to fund liabilities such as indemnification obligations, subject to fund-agreement limits.",
  "sec-40-erisa": "Addresses ERISA investors, required representations, and the intent to limit benefit-plan participation below the 25% plan-asset threshold.",
  "sec-41-amendments": "Sets amendment consent mechanics and protects limited partners from adverse amendments without required consent or equal application.",
  "sec-42-side-letters": "Permits side letters or modified terms for particular investors, including potentially better economics or other fund-agreement variations.",
  "sec-43-changes-in-taxation-of-carried-interest": "Allows GP amendments to address adverse carried-interest tax-law changes so long as limited partners are not adversely affected.",
  "sec-44-fiscal-year": "Sets the fiscal year as the calendar year unless law requires otherwise.",
  "sec-45-taxation": "Summarizes intended partnership tax treatment, partner-level reporting obligations, and the need for investors to consider tax consequences.",
  "sec-46-general-risks": "Warns that fund investments are risky, may result in total loss, and require investors to consult their own investment, legal, and tax advisers."
};

function applySummaries(payload) {
  payload.termSheet.summary = documentSummary;
  payload.openItemsMemo.summary = openItemsSummary;
  payload.termSheet.sections = payload.termSheet.sections.map((section) => ({
    ...section,
    summary: sectionSummaries[section.id] || ""
  }));
  return payload;
}

const payload = applySummaries(JSON.parse(fs.readFileSync(jsonPath, "utf8")));
const jsonText = JSON.stringify(payload, null, 2);
fs.writeFileSync(jsonPath, `${jsonText}\n`, "utf8");
fs.writeFileSync(jsPath, `window.ORRICK_SEED_DATA = ${jsonText};\n`, "utf8");
console.log(`Applied ${Object.keys(sectionSummaries).length} section summaries.`);
