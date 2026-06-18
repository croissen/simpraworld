import { emptyDoc, uid } from './types'
import type { Placement, SimpraWorldDoc, SNode } from './types'
import { EARTH_IMAGE } from './earthImage'

// 첫 방문 시 보이는 기본 세계.
// My Universe(최상위) 안에 earth.png 를 입힌 SimpraWorld 폴더 1개(0,0, 크기100).
export function makeSampleWorld(): SimpraWorldDoc {
  const doc = emptyDoc()

  doc.assets.push({ id: 'a_earth', kind: 'image', mime: 'image/png', thumb: EARTH_IMAGE })

  const node = (
    id: string,
    type: SNode['type'],
    name: string,
    extra: Partial<SNode> = {},
  ): SNode => ({
    id,
    type,
    name,
    shape: type === 'folder' ? 'rect' : 'circle',
    w: 68,
    h: 68,
    color: type === 'folder' ? '#5b8cff' : '#34c98a',
    updatedAt: Date.now(),
    ...extra,
  })
  const place = (nodeId: string, space: string | null, x: number, y: number): Placement => ({
    id: uid('p'),
    nodeId,
    space,
    x,
    y,
  })

  doc.nodes.push(
    // 첫 세계 = earth 이미지 폴더
    node('f_world', 'folder', 'SimpraWorld', {
      shape: 'image',
      assetId: 'a_earth',
      w: 100,
      h: 100,
      color: '#7c5cff',
    }),
    node('f_home', 'folder', '🏠 Home', { color: '#5b8cff' }),
    node('f_friends', 'folder', '👥 Friends', { color: '#ff8c5b' }),
    node('f_fridge', 'folder', '🧊 Fridge', { color: '#3fb6d3' }),
    node('m_kimchi', 'memo', 'Eggs', {
      body: 'Qty: 3\nExpiry: 6/30',
      color: '#e3b341',
    }),
    node('m_milk', 'memo', 'Milk', {
      body: 'Qty: 1\nExpiry: 6/20',
      color: '#eeeeff',
    }),
    node('m_hong', 'memo', 'John Doe', {
      body: 'Age: 27\nHeight: 175\nPhone: 010-1234-5678',
      color: '#a78bfa',
    }),
    node('m_kim', 'memo', 'Jane Doe', {
      body: 'Age: 31\nHeight: 180\nPhone: 010-9876-5432',
      color: '#f472b6',
    }),
  )

  doc.placements.push(
    place('f_world', null, 0, 0), // My Universe 안 (0,0), 크기 100
    place('f_home', 'f_world', -160, -40),
    place('f_friends', 'f_world', 170, -40),
    place('f_fridge', 'f_home', 0, 0),
    place('m_kimchi', 'f_fridge', -60, 0),
    place('m_milk', 'f_fridge', 70, 20),
    place('m_hong', 'f_friends', -50, -10),
    place('m_kim', 'f_friends', 80, 30),
  )

  doc.edges.push({ id: uid('e'), from: 'f_home', to: 'f_friends' })

  return doc
}
