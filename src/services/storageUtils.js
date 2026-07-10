// Extrai o caminho do arquivo dentro do bucket a partir do valor salvo no
// banco. Aceita o formato novo (caminho puro, ex: "uid/123.jpg") e URLs
// publicas antigas (ex: "https://.../object/public/bucket/uid/123.jpg"),
// para os registros criados antes dos buckets ficarem privados.
export const storagePathFrom = (value, bucket) => {
  if (!value) return null
  if (!value.startsWith('http')) return value

  const marker = `/object/public/${bucket}/`
  const idx = value.indexOf(marker)
  if (idx === -1) return null

  return decodeURIComponent(value.slice(idx + marker.length).split('?')[0])
}
