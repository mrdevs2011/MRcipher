'use client';

import { useState } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/cjs/languages/hljs/javascript';
import python from 'react-syntax-highlighter/dist/cjs/languages/hljs/python';
import java from 'react-syntax-highlighter/dist/cjs/languages/hljs/java';
import go from 'react-syntax-highlighter/dist/cjs/languages/hljs/go';
import php from 'react-syntax-highlighter/dist/cjs/languages/hljs/php';
import bash from 'react-syntax-highlighter/dist/cjs/languages/hljs/bash';
import html from 'react-syntax-highlighter/dist/cjs/languages/hljs/xml';
import { atomOneDark } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('php', php);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('html', html);

type TemplateKey = 'javascript' | 'python' | 'java' | 'go' | 'php' | 'curl' | 'html';

interface CodeTemplatesProps {
  serverUrl: string;
  apiKey: string;
}

const templates: Record<
  TemplateKey,
  { label: string; language: string; code: (serverUrl: string, apiKey: string) => string }
> = {
  javascript: {
    label: 'JavaScript / Node.js',
    language: 'javascript',
    code: (url, key) => `const SERVER_URL = "${url}";
const API_KEY = "${key}";

async function encrypt(content) {
  const res = await fetch(\`\${SERVER_URL}/api/v1/encrypt\`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: \`Bearer \${API_KEY}\`,
      origin: SERVER_URL,
    },
    body: JSON.stringify({ content }),
  });
  return res.json();
}

async function decrypt(encrypted) {
  const res = await fetch(\`\${SERVER_URL}/api/v1/decrypt\`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: \`Bearer \${API_KEY}\`,
      origin: SERVER_URL,
    },
    body: JSON.stringify({ content: encrypted }),
  });
  return res.json();
}`,
  },
  python: {
    label: 'Python',
    language: 'python',
    code: (url, key) => `import requests

SERVER_URL = "${url}"
API_KEY = "${key}"

def encrypt(content):
    return requests.post(
        f"{SERVER_URL}/api/v1/encrypt",
        headers={
            "content-type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
            "origin": SERVER_URL,
        },
        json={"content": content},
    ).json()

def decrypt(encrypted):
    return requests.post(
        f"{SERVER_URL}/api/v1/decrypt",
        headers={
            "content-type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
            "origin": SERVER_URL,
        },
        json={"content": encrypted},
    ).json()`,
  },
  java: {
    label: 'Java',
    language: 'java',
    code: (url, key) => `import java.net.http.*;
import java.net.URI;

public class MRCipherClient {
    private static final String SERVER_URL = "${url}";
    private static final String API_KEY = "${key}";

    private static HttpResponse<String> post(String path, String body) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(SERVER_URL + path))
            .header("content-type", "application/json")
            .header("Authorization", "Bearer " + API_KEY)
            .header("origin", SERVER_URL)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
}`,
  },
  go: {
    label: 'Go',
    language: 'go',
    code: (url, key) => `package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

const SERVER_URL = "${url}"
const API_KEY = "${key}"

func post(path string, body []byte) (*http.Response, error) {
    req, err := http.NewRequest("POST", SERVER_URL+path, bytes.NewBuffer(body))
    if err != nil {
        return nil, err
    }
    req.Header.Set("content-type", "application/json")
    req.Header.Set("Authorization", "Bearer "+API_KEY)
    req.Header.Set("origin", SERVER_URL)
    return http.DefaultClient.Do(req)
}`,
  },
  php: {
    label: 'PHP',
    language: 'php',
    code: (url, key) => `<?php

const SERVER_URL = "${url}";
const API_KEY = "${key}";

function mr_request($path, $payload) {
    $ch = curl_init(SERVER_URL . $path);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "content-type: application/json",
        "Authorization: Bearer " . API_KEY,
        "origin: " . SERVER_URL,
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}`,
  },
  curl: {
    label: 'cURL',
    language: 'bash',
    code: (url, key) => `curl -X POST ${url}/api/v1/encrypt \\
  -H "content-type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -H "origin: ${url}" \\
  -d '{"content":{"email":"user@example.com"}}'`,
  },
  html: {
    label: 'HTML Fetch',
    language: 'html',
    code: (url, key) => `<!DOCTYPE html>
<html>
<head><title>MRcipher demo</title></head>
<body>
<script>
const SERVER_URL = "${url}";
const API_KEY = "${key}";

async function encrypt(content) {
  const res = await fetch(SERVER_URL + "/api/v1/encrypt", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Authorization": "Bearer " + API_KEY,
    },
    body: JSON.stringify({ content }),
  });
  return res.json();
}
</script>
</body>
</html>`,
  },
};

export function CodeTemplates({ serverUrl, apiKey }: CodeTemplatesProps) {
  const [active, setActive] = useState<TemplateKey>('javascript');
  const [copied, setCopied] = useState(false);

  const activeTemplate = templates[active];
  const code = activeTemplate.code(serverUrl, apiKey);

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-2">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        {(Object.keys(templates) as TemplateKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border)',
              background: active === key ? 'var(--primary)' : 'var(--bg-input)',
              color: active === key ? '#020617' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {templates[key].label}
          </button>
        ))}
      </div>

      <div
        style={{
          background: '#020617',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {activeTemplate.label}
          </span>
          <button
            onClick={copyCode}
            style={{
              padding: '0.25rem 0.75rem',
              background: copied ? 'var(--success)' : 'transparent',
              color: copied ? '#020617' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            {copied ? 'Nusxa olindi!' : 'Nusxa olish'}
          </button>
        </div>

        <SyntaxHighlighter
          language={activeTemplate.language}
          style={atomOneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.85rem',
            background: '#020617',
          }}
          showLineNumbers
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
