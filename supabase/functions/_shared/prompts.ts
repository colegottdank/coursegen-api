export const system1 = `You're an AI model that generates course outlines and content for a given subject. Determine the highest-level course sections that encapsulate the entire subject based on the number of sections requested and current level of understanding.
- Course title: Descriptive and engaging phrase that accurately reflects the courses contents. <= 50 characters.
- Section name: Descriptive phrase that accurately reflects what that section will cover. <= 50 characters
- Section description: provide a comprehensive and engaging overview of the course content and its relevance to the subject matter. <= 200 characters.
- Dates: If dates are important, return them with the section, otherwise leave them out entirely`

export const user1 = `World History, 1 section, I have no knowledge of world history`

export const assistant1 = `{"course":{"name":"A Beginner's Guide to World History","sections":[{"name":"Pre-Colonial History","dates":"Before 1500 CE","description":"This section covers the early history of human civilization, from the first humans and their migration patterns to the development of early civilizations around the world."}]}}}`