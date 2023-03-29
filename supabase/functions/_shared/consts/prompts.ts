export const course_outline_system1 = `You're an AI model that generates course outlines and content for a given subject. Determine the highest-level course sections that encapsulate the entire subject based on the number of sections requested and current level of understanding.
- Course title: Descriptive and engaging phrase that accurately reflects the courses contents. <= 50 characters.
- Course description: provide a comprehensive and engaging overview of the course content and its relevance to the subject matter. <= 200 characters.
- Section title: Descriptive phrase that accurately reflects what that section will cover. <= 50 characters
- Section description: provide a comprehensive and engaging overview of the course content and its relevance to the subject matter. <= 200 characters.
- Dates: If dates are important, return them with the section/course, otherwise leave completely empty
- Error handling: If an invalid subject or there is uncertainty on what the user requested, return appropriate error message, suggested corrections`;

export const course_outline_user1 = `Subject: History of the Space Race, Sections: 2, Proficiency: Beginner`;

export const course_outline_assistant1 = `{"success": true, "data": {"course": {"title": "The Space Race: A Historic Journey", "dates": "1945-1975", "description": "Explore the history of the Space Race, the fascinating competition between the US and USSR to achieve spaceflight supremacy.", "sections": [{"title": "The Early Years", "dates": "1945-1961", "description": "Learn about the origins of the Space Race, from the development of rocket technology to the first human-made satellites."}, {"title": "Moon Landing and Beyond", "dates": "1961-1975", "description": "Discover the climax of the Space Race, including the groundbreaking Apollo Moon landing and the era of cooperation that followed."}]}}}`;

export const course_outline_user2error = `Ben Frkl1n, 1 section, I have no knowledge of Ben Frkl1n`;

export const course_outline_assistant2error = `{"success":false,"data":{},"error":{"message":"I'm sorry, but I'm not familiar with the subject "Ben Frkl1n". Did you mean "Benjamin Franklin"? Could you please provide me with a valid subject for me to generate the course outline?"}}`;

export const course_outline_system2 = `As an AI, create course outlines for given subjects. Determine high-level sections based on sections requested and understanding level. Include: Course title (<=50 chars), Course description (<=200 chars), Section title (<=50 chars), Section description (<=200 chars). Add dates if important. Handle errors: return messages for invalid subjects or uncertainties.`;



export const section_content_system1 = `You're an AI model that generates detailed and lengthy content for a given section within the context of an existing course outline. Ensure the content is engaging, relevant, and accurate without repeating information from other sections. Return the content in markdown format. If the section is not recognized, return an appropriate error message and suggested corrections. Content (>= 2000 words & <= 3000 words)`;

export const section_content_user1 = `Section: The Early Years, Proficiency: Beginner`;

export const section_content_assistant1 = `# The Early Years of the Space Race

The early years of the Space Race were marked by fierce competition between the Soviet Union and the United States in space exploration. 

## Sputnik 1

In 1957, the Soviet Union launched Sputnik 1, the first human-made object to orbit Earth. This event sent shockwaves around the world and served as a wakeup call for the United States.

## NASA and Explorer 1

In response to Sputnik 1, the United States established the National Aeronautics and Space Administration (NASA) and launched its first satellite, Explorer 1, in 1958.

## First Humans in Space

The competition intensified with milestones like Yuri Gagarin becoming the first human in space in 1961. Shortly after, Alan Shepard became the first American in space later that year.`;

export const section_content_user2error = `Section: Sp4ce R4c3, Proficiency: Beginner`;

export const section_content_assistant2error = `{"success": false, "error": {"message": "I'm sorry, but I'm not familiar with the section 'Sp4ce R4c3'. Did you mean 'Space Race'? Please provide a valid section for me to generate the content."}}`;