-- Additional enquiry states used by the single-Admin operating workflow.
alter type public.enquiry_status add value if not exists 'requirement_received';
alter type public.enquiry_status add value if not exists 'quotation_required';
alter type public.enquiry_status add value if not exists 'quotation_sent';
alter type public.enquiry_status add value if not exists 'follow_up';
alter type public.enquiry_status add value if not exists 'converted';
alter type public.enquiry_status add value if not exists 'not_relevant';
alter type public.enquiry_status add value if not exists 'closed';
