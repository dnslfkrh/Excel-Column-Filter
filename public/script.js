function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

document.getElementById('uploadForm').addEventListener('submit', function (event) {
    event.preventDefault();

    if (!confirm('업로드 방법을 확인하셨습니까?')) {
        return;
    }

    hideError();
    showLoading();
    const formData = new FormData(this);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            const checkboxesDiv = document.getElementById('checkboxes');
            checkboxesDiv.innerHTML = '';
            data.headers.forEach(header => {
                const div = document.createElement('div');
                div.innerHTML = `<label><input type="checkbox" name="columns" value="${header}"> ${header}</label>`;
                checkboxesDiv.appendChild(div);
            });
            document.getElementById('filterOptions').classList.remove('hidden');
        })
        .catch(error => {
            hideLoading();
            showError('예상치 못한 오류 또는 시간 초과입니다. 다시 한번 시도해 주세요.');
            console.error('Error:', error);
        });
});

document.getElementById('filterForm').addEventListener('submit', function (event) {
    event.preventDefault();

    if (!confirm('엑셀 파일을 추출하시겠습니까?')) {
        return;
    }

    hideError();
    showLoading();

    const selectedColumns = Array.from(document.querySelectorAll('input[name="columns"]:checked'))
        .map(checkbox => checkbox.value);

    if (selectedColumns.length === 0) {
        hideLoading();
        showError('Please select at least one column.');
        return;
    }

    const fileName = document.getElementById('fileName').value.trim();
    if (!fileName) {
        hideLoading();
        showError('Please enter a valid file name.');
        return;
    }

    fetch('/filter', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ columns: selectedColumns, fileName })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }
            return response.blob();
        })
        .then(blob => {
            hideLoading();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName + '.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            window.location.reload();
        })
        .catch(error => {
            hideLoading();
            showError('예상치 못한 오류가 발생하였습니다.');
            console.error('Error:', error);
        });
});

document.getElementById('helpButton').addEventListener('click', function (event) {
    event.stopPropagation();
    const popup = document.getElementById('helpPopup');
    popup.classList.toggle('hidden');
});

document.addEventListener('click', function (event) {
    const popup = document.getElementById('helpPopup');
    const helpButton = document.getElementById('helpButton');
    if (!popup.classList.contains('hidden') && !popup.contains(event.target) && event.target !== helpButton) {
        popup.classList.add('hidden');
    }
});