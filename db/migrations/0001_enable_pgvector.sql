-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create indexes for vector columns if they don't exist
-- Note: HNSW indexes are created in the schema.ts file, but we ensure they exist here

-- Ensure tasks embedding index exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'tasks' 
        AND indexname = 'tasks_embedding_idx'
    ) THEN
        CREATE INDEX tasks_embedding_idx ON tasks USING hnsw (embedding vector_cosine_ops);
    END IF;
END $$;

-- Ensure agent_memory embedding index exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'agent_memory' 
        AND indexname = 'agent_memory_embedding_idx'
    ) THEN
        CREATE INDEX agent_memory_embedding_idx ON agent_memory USING hnsw (embedding vector_cosine_ops);
    END IF;
END $$;

-- Create a function to calculate cosine similarity (if not exists)
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float
LANGUAGE sql
IMMUTABLE STRICT
AS $$
    SELECT 1 - (a <=> b);
$$;

-- Create a function to find similar tasks
CREATE OR REPLACE FUNCTION find_similar_tasks(
    query_embedding vector,
    similarity_threshold float DEFAULT 0.7,
    max_results int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    title varchar,
    description text,
    similarity float
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        t.id,
        t.title,
        t.description,
        cosine_similarity(t.embedding, query_embedding) as similarity
    FROM tasks t
    WHERE t.embedding IS NOT NULL
        AND cosine_similarity(t.embedding, query_embedding) >= similarity_threshold
    ORDER BY similarity DESC
    LIMIT max_results;
$$;

-- Create a function to find similar agent memories
CREATE OR REPLACE FUNCTION find_similar_memories(
    query_embedding vector,
    agent_type_filter varchar DEFAULT NULL,
    similarity_threshold float DEFAULT 0.7,
    max_results int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    agent_type varchar,
    context_key varchar,
    content text,
    similarity float,
    importance int,
    last_accessed_at timestamp
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        am.id,
        am.agent_type,
        am.context_key,
        am.content,
        cosine_similarity(am.embedding, query_embedding) as similarity,
        am.importance,
        am.last_accessed_at
    FROM agent_memory am
    WHERE am.embedding IS NOT NULL
        AND (agent_type_filter IS NULL OR am.agent_type = agent_type_filter)
        AND cosine_similarity(am.embedding, query_embedding) >= similarity_threshold
    ORDER BY similarity DESC
    LIMIT max_results;
$$;

-- Create a function to update embedding and track access
CREATE OR REPLACE FUNCTION update_memory_access(memory_id uuid)
RETURNS void
LANGUAGE sql
AS $$
    UPDATE agent_memory 
    SET 
        last_accessed_at = NOW(),
        access_count = access_count + 1
    WHERE id = memory_id;
$$;