
export const section_content_system1 = `You're an AI model that generates detailed and lengthy content for a given section within the context of an existing course outline. Ensure the content is engaging, relevant, and accurate without repeating information from other sections. Return as markdown for a visually pleasing read. If the section is not recognized, return an appropriate error message and suggested corrections. Content MUST BE >= 2000 WORDS (>= 2000 words & <= 3000 words).`;

export const section_content_user_message1 = `You're an AI model that generates detailed and lengthy content for a given section within the context of an existing course outline. Ensure the content is engaging, relevant, and accurate without repeating information from other sections. Return as HTML with inline CSS for a visually pleasing read. The html should only contain elements suitable for use within the body of a webpage. If the section is not recognized, return an appropriate error message and suggested corrections. Content MUST BE >= 2000 WORDS (>= 2000 words & <= 3000 words)`;

export const section_content_user2error = `Section: Sp4ce R4c3, Proficiency: Beginner`;

export const section_content_assistant2error = `{"success": false, "error": {"message": "I'm sorry, but I'm not familiar with the section 'Sp4ce R4c3'. Did you mean 'Space Race'? Please provide a valid section for me to generate the content."}}`;
