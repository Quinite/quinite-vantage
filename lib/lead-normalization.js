import { formatIndianMobile } from '@/lib/utils'

export function normalizeLead(source, rawData) {
    const standardized = {
        name: null,
        phone: null,
        email: null,
        project_id: rawData.project_id || null, // API should inject this if known
        source: source,
        external_lead_id: null,
        other_details: {},
        raw_data: rawData
    };

    switch (source.toLowerCase()) {
        case 'magicbricks':
            // Example MB Schema: { "mobile": "...", "cust_name": "...", "id": "MB123" }
            standardized.name = rawData.cust_name || rawData.name || 'Unknown User';
            standardized.phone = formatIndianMobile(rawData.mobile || rawData.phone_no);
            standardized.email = rawData.email;
            standardized.external_lead_id = rawData.id || rawData.leadId;
            standardized.other_details = {
                budget: rawData.budget,
                property_type: rawData.property_type
            };
            break;

        case '99acres':
            // Example 99Acres: { "contact_details": { "mobile": "..." }, "name": "..." }
            standardized.name = rawData.name;
            standardized.phone = formatIndianMobile(rawData.contact_details?.mobile || rawData.mobile);
            standardized.email = rawData.email;
            standardized.external_lead_id = rawData.query_id || rawData.lead_id;
            break;

        case 'facebook':
            // Facebook Lead Ads
            standardized.name = rawData.full_name;
            standardized.phone = formatIndianMobile(rawData.phone_number);
            standardized.email = rawData.email;
            standardized.external_lead_id = rawData.id;
            break;

        case 'csv_manual':
        default:
            // Flexible / Fuzzy Matching for CSVs
            const keys = Object.keys(rawData).map(k => k.toLowerCase());

            // Fuzzy match logic for Name
            const nameKey = keys.find(k => k.includes('name') || k.includes('customer') || k.includes('client'));
            if (nameKey) standardized.name = findValue(rawData, nameKey);

            // Fuzzy match logic for Phone
            const phoneKey = keys.find(k => k.includes('phone') || k.includes('mobile') || k.includes('contact') || k.includes('cell'));
            if (phoneKey) standardized.phone = formatIndianMobile(findValue(rawData, phoneKey));

            // Fuzzy match logic for Email
            const emailKey = keys.find(k => k.includes('email') || k.includes('mail'));
            if (emailKey) standardized.email = findValue(rawData, emailKey);

            break;
    }

    return standardized;
}

function findValue(obj, keyFragment) {
    const key = Object.keys(obj).find(k => k.toLowerCase().includes(keyFragment));
    return key ? obj[key] : null;
}
