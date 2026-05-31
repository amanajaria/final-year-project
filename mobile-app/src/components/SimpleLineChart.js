import React from 'react'
import { View } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'

export default function SimpleLineChart({ data = [], width = 220, height = 80, stroke = '#6270f1', fill = 'rgba(98,112,241,0.08)' }) {
  const n = Math.max(2, data.length)
  const max = Math.max(...data, 100)
  const min = Math.min(...data, 0)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (n - 1)) * width
    const y = height - ((v - min) / range) * height
    return { x, y }
  })

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')

  // simple area path for subtle fill (approximated)
  const areaD = points.length ? `${d} L ${width} ${height} L 0 ${height} Z` : ''

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {areaD ? <Path d={areaD} fill={fill} stroke="none" /> : null}
        <Path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2.2} fill={stroke} />
        ))}
      </Svg>
    </View>
  )
}
