async function getBackendBaseUrl() {
    try {
        const response = await fetch('/backend_url.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Resposta ${response.status}`);
        }

        const data = await response.json();
        if (typeof data.backend_url === 'string' && data.backend_url.trim()) {
            return data.backend_url.trim();
        }
    } catch (error) {
        console.warn('Falha ao carregar backend_url.json, usando localhost:', error);
    }

    return 'http://localhost:8000';
}

function getUserProfile() {
    try {
        const record = JSON.parse(localStorage.getItem('user_profile') || 'null');
        const profiles = [
            'produtor_rural',
            'cooperativa',
            'empresa',
            'pesquisador_universitario',
            'tecnico',
            'instituicao_publica',
            'visitante'
        ];
        return profiles.includes(record?.profile) ? record.profile : 'visitante';
    } catch {
        return 'visitante';
    }
}

async function gerarRelatorio() {
    const perguntas = document.getElementById('input_perguntas').value
        .split('\n')
        .map(p => p.trim())
        .filter(p => p);

    const groundTruths = document.getElementById('input_ground_truths').value
        .split('\n')
        .map(g => g.trim())
        .filter(g => g);

    if (perguntas.length === 0) {
        alert('Insira ao menos uma pergunta.');
        return;
    }

    document.getElementById('loading').style.display = 'block';
    document.getElementById('btn_pdf').style.display = 'none';
    document.getElementById('content').innerHTML = '';

    try {
        const apiBaseUrl = await getBackendBaseUrl();
        const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/perguntar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                perguntas,
                ground_truths: groundTruths,
                profile: getUserProfile()
            })
        });

        if (!response.ok) throw new Error('Erro na API');

        const data = await response.json();

        renderizarResultados(data.resultados);

        document.getElementById('btn_pdf').style.display = 'block';

    } catch (err) {
        alert('Erro ao conectar com a API: ' + err.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function renderizarResultados(resultados) {
    const content = document.getElementById('content');
    content.innerHTML = '';

    resultados.forEach((item, index) => {
        const flagHTML = item.hallucination_flag === 0
            ? `<div class="container_flag_not_alucination"><p>Sem possível alucinação</p></div>`
            : `<div class="container_flag_alucination"><p>Com possível alucinação</p></div>`;

        const refsHTML = (item.referencias || []).map((ref, i) => `
            <div class="desc_refs">
                <div>${i + 1}</div>
                <p>${ref}</p>
            </div>
        `).join('');

        const avaliacao = `
            <div class="avaliacao">
                <div class="avaliacao_container">
                    <p class="title_avaliacao">Avaliação</p>
                    <div class="number_avaliacao"><p>${index + 1}</p></div>
                </div>

                <div class="pergunta_container">
                    <div class="pergunta">Pergunta</div>
                    <div class="pergunta_user">${item.pergunta}</div>
                    ${flagHTML}
                </div>

                <div class="container_resposta">
                    <div class="resposta_model">
                        <div class="title_resposta">Resposta SB100</div>
                        <p>${item.resposta}</p>
                    </div>
                    <div class="resposta_esperada">
                        <div class="title_esperada">Resposta Esperada</div>
                        <p>${item.ground_truth || '—'}</p>
                    </div>
                </div>

                <div class="refs">
                    <div class="pai_refs">
                        <div class="header_refs">
                            <div class="title_refs">Referências Principais</div>
                            <div class="numbers_refs">${(item.referencias || []).length}</div>
                        </div>
                        ${refsHTML}
                    </div>
                    <div class="space"></div>
                </div>
            </div>
        `;

        content.innerHTML += avaliacao;
    });
}

function exportarPDF() {
    window.print();
}