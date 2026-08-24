/**
 * The 25 administrative districts of Sri Lanka.
 *
 * This is the vocabulary the system stores a location in: a user's `assignedDistrict`
 * is picked from this list on the Add Staff Account screen, and that value is what gets
 * stamped onto `submission_location` when a request is raised. A location filter must
 * therefore offer these, not the Educational Districts master — that master is a
 * different thing (district/zone pairs for schools) and currently holds only 11 of the
 * 25, so filtering from it silently hid every request raised in the other 14.
 *
 * Spelled as the `district_cutoff` master spells them, so a name from here always
 * matches a stored row.
 */
export const SRI_LANKAN_DISTRICTS = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
] as const;
