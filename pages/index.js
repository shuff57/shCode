import Head from 'next/head';
import Script from 'next/script';

export default function Home() {
  return (
    <>
      <Head>
        <title>Debug Exercise with Resizable Live Editor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <aside id="sidebar" aria-label="File explorer">
        <h2>Files</h2>
        <ul id="fileList"></ul>
        <p className="drop-hint">Drag files here</p>
      </aside>
      {/* Collapsible “card” with editor + live preview + resizer */}
      <details className="editor-card" open>
        <summary>Starter Code & Live Preview</summary>
        <div className="editor-body">
          <div className="editor-preview-container" id="split">
            <div className="pane" id="editorPane">
              <div id="editor"></div>
            </div>
            <div
              className="divider"
              id="divider"
              tabIndex="0"
              aria-label="Resize editor and preview"
            >
              <span className="drag-handle" aria-hidden="true"></span>
            </div>
            <div className="pane" id="previewPane">
              <iframe id="preview" title="Live Preview"></iframe>
            </div>
            <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
          </div>
        </div>
      </details>

      <h2>Requirements to Pass</h2>

      <div className="requirement">
        <h3>Requirement 1</h3>
        <p>
          You should have exactly one <code>h1</code> element on the page.
        </p>
      </div>
      <div className="requirement">
        <h3>Requirement 2</h3>
        <p>
          You should not remove the <code>&lt;h1&gt;Hello from Camperbot!&lt;/h1&gt;</code>
          element from the page.
        </p>
      </div>
      <div className="requirement">
        <h3>Requirement 3</h3>
        <p>You should have exactly one <code>h2</code> element on the page.</p>
      </div>
      <div className="requirement">
        <h3>Requirement 4</h3>
        <p>You should have an <code>h2</code> element with the text "About".</p>
      </div>
      <div className="requirement">
        <h3>Requirement 5</h3>
        <p>
          You should have a paragraph element with the text "My name is
          Camperbot and I love learning new things."
        </p>
      </div>
      <div className="requirement">
        <h3>Requirement 6</h3>
        <p>You should have a paragraph element with the text "I enjoy solving puzzles."</p>
      </div>
      <div className="requirement">
        <h3>Requirement 7</h3>
        <p>You should have exactly two paragraph elements on the page.</p>
      </div>
      <div className="requirement">
        <h3>Requirement 8</h3>
        <p>You should have exactly one <code>h3</code> element on the page.</p>
      </div>
      <div className="requirement">
        <h3>Requirement 9</h3>
        <p>You should have an <code>h3</code> element with the text "Background and Interests".</p>
      </div>
      <div className="requirement">
        <h3>Requirement 10</h3>
        <p>You should have exactly five total elements on the page.</p>
      </div>

      <Script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js" />
      <Script src="/app.js" />
      <Script src="https://unpkg.com/lucide@0.44.0/dist/umd/lucide.js" />
      <Script src="/autograder.js" />
    </>
  );
}
