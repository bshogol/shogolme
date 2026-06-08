/* =========================================================================
   SHOGOL — content manifest (the ONE place a post is registered).
   Add a post: append an entry to SHOGOL_POSTS with its date + series.
   Add a series: add an entry to SHOGOL_SERIES, then add its posts below.
   The homepage feed (index.html) and the dynamic series page (series.html)
   both render from these — no build step, no backend.
   ========================================================================= */

window.SHOGOL_SERIES = {
  "tokens-to-agents": {
    title: "From Tokens to Agents",
    tag: "AI",
    blurb: "How modern AI actually works — from the raw text a model reads, to the engines that serve it at scale, to the agents that act on your behalf. Intuition-first, with diagrams."
  },
  "advanced-go-patterns": {
    title: "Advanced Go Patterns",
    tag: "GO",
    blurb: "The idioms, tradeoffs, and footguns that separate code that compiles from code that reads like it was written by someone who's shipped a lot of Go. Code-first, real snippets."
  }
};

window.SHOGOL_POSTS = [
  // ---- From Tokens to Agents (AI) ----
  { series:"tokens-to-agents", part:1,  date:"2026-01-08", category:"Foundations", title:"The Big Picture", dek:"What actually changed, and a map of the whole stack.", url:"posts/tokens-to-agents/01-the-big-picture.html" },
  { series:"tokens-to-agents", part:2,  date:"2026-01-21", category:"Foundations", title:"What Is a Large Language Model?", dek:"Why “predict the next token” turned out to be so powerful.", url:"posts/tokens-to-agents/02-what-is-an-llm.html" },
  { series:"tokens-to-agents", part:3,  date:"2026-01-27", category:"Foundations", title:"Tokens & Tokenization", dek:"How text becomes the numbers a model can chew on.", url:"posts/tokens-to-agents/03-tokens-and-tokenization.html" },
  { series:"tokens-to-agents", part:4,  date:"2026-02-09", category:"Foundations", title:"Inside the Transformer", dek:"Attention, embeddings, and what's really happening in there.", url:"posts/tokens-to-agents/04-inside-the-transformer.html" },
  { series:"tokens-to-agents", part:5,  date:"2026-02-22", category:"Training", title:"How Models Are Trained", dek:"Pretraining, fine-tuning, and the human feedback loop.", url:"posts/tokens-to-agents/05-how-models-are-trained.html" },
  { series:"tokens-to-agents", part:6,  date:"2026-03-01", category:"Inference", title:"Inference: How a Model Generates Text", dek:"Autoregression, sampling, and temperature.", url:"posts/tokens-to-agents/06-inference-generating-text.html" },
  { series:"tokens-to-agents", part:7,  date:"2026-03-14", category:"Inference", title:"The Inference Engine", dek:"KV cache, batching, and the economics of serving.", url:"posts/tokens-to-agents/07-the-inference-engine.html" },
  { series:"tokens-to-agents", part:8,  date:"2026-03-27", category:"Inference", title:"Making Models Faster & Cheaper", dek:"Quantization, distillation, speculative decoding.", url:"posts/tokens-to-agents/08-faster-and-cheaper.html" },
  { series:"tokens-to-agents", part:9,  date:"2026-04-02", category:"Prompting", title:"Prompting & Context", dek:"The prompt as a program you write in English.", url:"posts/tokens-to-agents/09-prompting-and-context.html" },
  { series:"tokens-to-agents", part:10, date:"2026-04-15", category:"Harness", title:"The Harness", dek:"The loop and scaffolding that turn a model into a product.", url:"posts/tokens-to-agents/10-the-harness.html" },
  { series:"tokens-to-agents", part:11, date:"2026-04-28", category:"Tools", title:"Tool Use & Function Calling", dek:"Giving the model hands.", url:"posts/tokens-to-agents/11-tool-use.html" },
  { series:"tokens-to-agents", part:12, date:"2026-05-05", category:"Agents", title:"What Is an Agent?", dek:"The agentic loop, planning, and memory.", url:"posts/tokens-to-agents/12-what-is-an-agent.html" },
  { series:"tokens-to-agents", part:13, date:"2026-05-18", category:"Agents", title:"Multi-Agent Systems", dek:"Orchestration and dividing the work.", url:"posts/tokens-to-agents/13-multi-agent-systems.html" },
  { series:"tokens-to-agents", part:14, date:"2026-05-31", category:"Memory", title:"RAG & Memory", dek:"Grounding models in real, current knowledge.", url:"posts/tokens-to-agents/14-rag-and-memory.html" },
  { series:"tokens-to-agents", part:15, date:"2026-06-02", category:"Future", title:"Evaluation, Safety & What's Next", dek:"How we measure quality, manage risk, and where this is heading.", url:"posts/tokens-to-agents/15-evaluation-safety-future.html" },

  // ---- Advanced Go Patterns (GO) ----
  { series:"advanced-go-patterns", part:1,  date:"2026-01-14", category:"API Design", title:"Functional Options", dek:"Constructors that stay clean as your config grows.", url:"posts/advanced-go-patterns/01-functional-options.html" },
  { series:"advanced-go-patterns", part:2,  date:"2026-02-03", category:"API Design", title:"Interface Design", dek:"Accept interfaces, return structs, and keep them small.", url:"posts/advanced-go-patterns/02-interface-design.html" },
  { series:"advanced-go-patterns", part:3,  date:"2026-02-16", category:"Errors", title:"Error Handling", dek:"Wrapping, sentinels, errors.Is/As, and custom error types.", url:"posts/advanced-go-patterns/03-error-handling.html" },
  { series:"advanced-go-patterns", part:4,  date:"2026-03-07", category:"Concurrency", title:"Concurrency Patterns", dek:"Pipelines, fan-in/fan-out, and worker pools done right.", url:"posts/advanced-go-patterns/04-concurrency-patterns.html" },
  { series:"advanced-go-patterns", part:5,  date:"2026-03-20", category:"Concurrency", title:"Context", dek:"Cancellation, deadlines, propagation, and the values trap.", url:"posts/advanced-go-patterns/05-context.html" },
  { series:"advanced-go-patterns", part:6,  date:"2026-04-09", category:"Concurrency", title:"Synchronization Beyond Channels", dek:"errgroup, semaphores, singleflight, and the sync toolbox.", url:"posts/advanced-go-patterns/06-synchronization.html" },
  { series:"advanced-go-patterns", part:7,  date:"2026-04-22", category:"Types", title:"Generics", dek:"Constraints, inference, and when not to reach for them.", url:"posts/advanced-go-patterns/07-generics.html" },
  { series:"advanced-go-patterns", part:8,  date:"2026-05-11", category:"Performance", title:"Performance & Memory", dek:"Escape analysis, sync.Pool, allocations, and profiling.", url:"posts/advanced-go-patterns/08-performance-and-memory.html" },
  { series:"advanced-go-patterns", part:9,  date:"2026-05-24", category:"Resiliency", title:"Resiliency Patterns", dek:"Retries, backoff, circuit breakers, timeouts, and bulkheads.", url:"posts/advanced-go-patterns/09-resiliency-patterns.html" },
  { series:"advanced-go-patterns", part:10, date:"2026-06-06", category:"RPC", title:"gRPC Patterns", dek:"Interceptors, streaming, deadlines, and idiomatic errors.", url:"posts/advanced-go-patterns/10-grpc-patterns.html" }
];
