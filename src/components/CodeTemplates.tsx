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
    label: 'JavaScript',
    language: 'javascript',
    code: (url, key) => `const SERVER_URL = "${url}";
const API_KEY = "${key}";

async function encrypt(content) {
  const res = await fetch(\`\${SERVER_URL}/api/v1/encrypt\`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Authorization": \`Bearer \${API_KEY}\`,
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
      "Authorization": \`Bearer \${API_KEY}\`,
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
        },
        json={"content": content},
    ).json()

def decrypt(encrypted):
    return requests.post(
        f"{SERVER_URL}/api/v1/decrypt",
        headers={
            "content-type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
        json={"content": encrypted},
    ).json()`,
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
    req, _ := http.NewRequest("POST", SERVER_URL+path, bytes.NewBuffer(body))
    req.Header.Set("content-type", "application/json")
    req.Header.Set("Authorization", "Bearer "+API_KEY)
    return http.DefaultClient.Do(req)
}`,
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
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
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
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    return json_decode(curl_exec($ch), true);
}`,
  },
  curl: {
    label: 'cURL',
    language: 'bash',
    code: (url, key) => `curl -X POST ${url}/api/v1/encrypt \\
  -H "content-type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"content":{"phone":"+998901234567"}}'`,
  },
  html: {
    label: 'HTML',
    language: 'html',
    code: (url, key) => `<script type="module">
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
</script>`,
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
    <div>
      <div className="tab-list">
        {(Object.keys(templates) as TemplateKey[]).map((key) => (
          <button
            key={key}
            className={`tab ${active === key ? 'active' : ''}`}
            onClick={() => setActive(key)}
          >
            {templates[key].label}
          </button>
        ))}
      </div>

      <div className="code-panel">
        <div className="code-panel-header">
          <span className="code-panel-label">{activeTemplate.label}</span>
          <button className="btn btn-ghost btn-sm" onClick={copyCode}>
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
