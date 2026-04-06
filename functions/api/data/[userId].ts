export interface Env {
  ONDUTY_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = context.params.userId as string;
  
  try {
    const data = await context.env.ONDUTY_KV.get(`user:${userId}`);
    if (!data) {
      return new Response(JSON.stringify({ users: [], dataByUser: {} }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(data, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to get data:', error);
    return new Response(JSON.stringify({ error: 'Failed to get data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const userId = context.params.userId as string;
  
  try {
    const data = await context.request.json();
    await context.env.ONDUTY_KV.put(`user:${userId}`, JSON.stringify(data));
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to save data:', error);
    return new Response(JSON.stringify({ error: 'Failed to save data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
