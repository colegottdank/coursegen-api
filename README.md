# CourseGen

Setup this jawn locally

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [Docker](https://www.docker.com/) (for running Postgres locally)

## Getting Started

1. Clone the repository to your local machine:

   ```sh
   git clone https://github.com/colegottdank/coursegen-api.git
   cd coursegen-api
   npm install
   ```

# Setting Up Supabase
1. Install Supabase CLI
   ```sh
   brew install supabase/tap/supabase
   ```
   Update using
   ```sh
   brew upgrade supabase
   ```

2. Ensure you have the .env.local file with required secrets (hmu for them)
   ```sh
   echo "OPENAI_API_KEY={APIKEY}" > .env.local
   ```

3. Make startup.sh executable 
   ```sh
   chmod +x ./scripts/startup.sh
   ```

4. Execute that jawn
   ```sh
   ./scripts/startup.sh
   ```