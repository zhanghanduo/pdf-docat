import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  // Prepare headers with Authorization if token exists
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  console.log(`Making ${method} request to ${url} with token: ${token ? 'present' : 'missing'}`);
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    console.error('Authentication error:', url);
    // Clear token if unauthorized
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // Create headers with Authorization token if it exists
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    console.log(`Making GET request to ${queryKey[0]} with token: ${token ? 'present' : 'missing'}`);
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    if (res.status === 401) {
      console.error('Authentication error in query:', queryKey[0]);
      
      // Clear token if unauthorized
      if (unauthorizedBehavior === "throw") {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
