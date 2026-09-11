const names = {
  mic:'mic', camera:'photo_camera', scan:'document_scanner', receipt:'receipt_long', gallery:'photo_library',
  check:'check_circle', shield:'shield', arrow:'arrow_forward', back:'arrow_back', volume:'volume_up', info:'info',
  wifiOff:'wifi_off', home:'home', list:'history', help:'forum', download:'download', payments:'payments', language:'language'
};

export function icon(name, size = 22, filled = false) {
  const symbol = names[name] ?? name;
  const fill = filled ? 1 : 0;
  return `<span class="material-symbols-rounded material-icon" aria-hidden="true" style="font-size:${size}px;font-variation-settings:'FILL' ${fill},'wght' 420,'GRAD' 0,'opsz' 24">${symbol}</span>`;
}
