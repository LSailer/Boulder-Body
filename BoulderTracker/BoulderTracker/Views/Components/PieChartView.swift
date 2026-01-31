import SwiftUI

/// A simple pie chart drawn with SwiftUI Canvas.
struct PieChartView: View {
    let data: [(result: BoulderResult, count: Int)]

    private var total: Int {
        data.reduce(0) { $0 + $1.count }
    }

    var body: some View {
        Canvas { context, size in
            let center = CGPoint(x: size.width / 2, y: size.height / 2)
            let radius = min(size.width, size.height) / 2
            var startAngle = Angle.degrees(-90)

            for item in data {
                guard total > 0 else { continue }
                let proportion = Double(item.count) / Double(total)
                let sweepAngle = Angle.degrees(360 * proportion)
                let endAngle = startAngle + sweepAngle

                let path = Path { p in
                    p.move(to: center)
                    p.addArc(
                        center: center,
                        radius: radius,
                        startAngle: startAngle,
                        endAngle: endAngle,
                        clockwise: false
                    )
                    p.closeSubpath()
                }

                context.fill(path, with: .color(item.result.color))
                startAngle = endAngle
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

#Preview {
    PieChartView(data: [
        (.flash, 5),
        (.done, 10),
        (.fail, 5)
    ])
    .frame(width: 200, height: 200)
    .padding()
}
