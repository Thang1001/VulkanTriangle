// Dựng trang code chi tiết cho một khối. Mỗi file blocks/<id>.html đặt window.BLOCK_ID rồi nạp file này.
(function () {
  const b = BY_ID[window.BLOCK_ID];
  const root = document.getElementById("page");
  if (!b) { root.textContent = "Không tìm thấy khối " + window.BLOCK_ID; return; }

  document.title = `${b.title} · Khối Vulkan`;
  const phase = PHASES[b.phase];
  document.documentElement.style.setProperty("--c", phase.color);

  const order = [...CANONICAL, ...CANONICAL_LOOP];
  const pos = order.indexOf(b.id);
  const prev = pos > 0 ? BY_ID[order[pos - 1]] : null;
  const next = pos >= 0 && pos < order.length - 1 ? BY_ID[order[pos + 1]] : null;
  const fix = b.fixId ? BY_ID[b.fixId] : null;
  const res = (ids) => ids.map((r) => `<span class="chip">${RESOURCES[r] || r}</span>`).join("") || `<span class="chip">Không cần gì, đây là điểm bắt đầu</span>`;
  const codeBlock = (title, src, lang) => `
    <div class="codebox">
      <div class="codebar"><span class="mono">${title}</span><button class="btn small copy" type="button">Copy</button></div>
      <pre class="code"><code>${highlight(src, lang)}</code></pre>
    </div>`;

  root.innerHTML = `
    <nav class="top">
      <a class="btn" href="../vulkan-builder.html">← Về Xưởng ghép</a>
      <span class="eyebrow">${b.trap ? "Khối bẫy" : pos >= 0 ? `Khối ${pos + 1} / ${order.length}` : ""} · ${phase.name}</span>
    </nav>

    <header class="head">
      <h1>${b.title}</h1>
      <p class="lede">${b.short}</p>
      ${b.trap ? `<div class="trapnote"><b>Đây là khối bẫy.</b> ${b.effect.kind === "warn" ? "Chạy được nhưng thừa." : "Khối này gây lỗi khi chạy."} ${fix ? `Khối đúng: <a href="${fix.id}.html">${fix.title}</a>.` : ""}</div>` : ""}
    </header>

    <section class="grid2">
      <div class="analogy"><span class="eyebrow">Trong xưởng tranh</span><p>${b.analogy}</p></div>
      <div class="deps">
        <div><span class="eyebrow">Cần có trước</span><div class="chips">${res(b.needs)}</div></div>
        <div><span class="eyebrow">Tạo ra</span><div class="chips">${b.provides.length ? res(b.provides) : `<span class="chip">Một frame trên màn hình</span>`}</div></div>
      </div>
    </section>

    <section class="prose"><h2>Khối này làm gì</h2><p>${b.why}</p></section>

    ${b.effect ? `<section class="effect effect-${b.effect.kind}">
      <span class="eyebrow">Khi chạy sẽ thế nào</span>
      <p class="mono">${b.effect.code}</p>
      <p>${b.effect.msg}</p>
    </section>` : ""}

    <section class="codes">
      <h2>Code</h2>
      ${b.globals ? codeBlock("Biến toàn cục", b.globals, "cpp") : ""}
      ${codeBlock(`Hàm ${b.fn}()`, b.code, "cpp")}
      ${(b.extra || []).map((x) => codeBlock(x.title, window[x.src], x.lang)).join("")}
      ${b.cleanup ? codeBlock("Trong cleanup()", b.cleanup, "cpp") : ""}
      <p class="callnote">Trong <span class="mono">main()</span> khối này là dòng: <code class="mono">${b.call}</code>${b.loopOnly ? " (đặt trong vòng lặp while)" : ""}</p>
    </section>

    ${b.notes.length ? `<section class="notes"><h2>Giải thích từng phần</h2>
      <dl>${b.notes.map((n) => `<div><dt class="mono">${n.h}</dt><dd>${n.t}</dd></div>`).join("")}</dl>
    </section>` : ""}

    ${b.pitfalls.length || b.mac ? `<section class="pitfalls"><h2>Hay sai ở đâu</h2>
      <ul>${b.pitfalls.map((p) => `<li>${p}</li>`).join("")}${b.mac ? `<li><b>macOS:</b> ${b.mac}</li>` : ""}</ul>
    </section>` : ""}

    <nav class="bottom">
      ${prev ? `<a class="btn" href="${prev.id}.html">← ${prev.title}</a>` : "<span></span>"}
      ${next ? `<a class="btn primary" href="${next.id}.html">${next.title} →</a>` : ""}
    </nav>`;

  root.querySelectorAll(".copy").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.closest(".codebox").querySelector("pre").innerText;
      navigator.clipboard.writeText(text).then(
        () => { btn.textContent = "Đã copy"; setTimeout(() => (btn.textContent = "Copy"), 1500); },
        () => { btn.textContent = "Không copy được"; }
      );
    });
  });
})();
