import SwiftUI

/// Displays session results with a pie chart and next-level recommendation.
struct SessionSummaryView: View {
    @EnvironmentObject var sessionStore: SessionStore
    let session: BoulderSession
    let onDone: () -> Void

    @StateObject private var viewModel: SessionSummaryViewModel

    init(session: BoulderSession, onDone: @escaping () -> Void) {
        self.session = session
        self.onDone = onDone
        _viewModel = StateObject(wrappedValue: SessionSummaryViewModel(session: session))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Session Complete!")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Level \(session.level.displayName)")
                    .font(.title2)
                    .foregroundStyle(.secondary)

                // Pie chart
                PieChartView(data: viewModel.chartData)
                    .frame(width: 220, height: 220)

                // Legend
                HStack(spacing: 20) {
                    ForEach(BoulderResult.allCases) { result in
                        legendItem(result)
                    }
                }

                // Stats
                VStack(spacing: 12) {
                    statRow("Flash", value: viewModel.flashCount, percent: viewModel.flashPercent)
                    statRow("Done", value: viewModel.doneCount, percent: viewModel.donePercent)
                    statRow("Fail", value: viewModel.failCount, percent: viewModel.failPercent)
                    Divider()
                    statRow("Total", value: viewModel.totalCount, percent: 100)
                }
                .padding()
                .background(Color(.systemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // Recommendation
                VStack(spacing: 8) {
                    Text("Next Session")
                        .font(.headline)
                    Text("Recommended: \(viewModel.recommendedLevel.displayName)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.blue)
                    Text(viewModel.recommendationReason)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .background(Color(.systemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                Button("Done") {
                    sessionStore.save(session)
                    onDone()
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
            .padding()
        }
        .navigationTitle("Summary")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
    }

    private func legendItem(_ result: BoulderResult) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(result.color)
                .frame(width: 12, height: 12)
            Text(result.displayName)
                .font(.caption)
        }
    }

    private func statRow(_ label: String, value: Int, percent: Int) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text("\(value)")
                .fontWeight(.semibold)
            Text("(\(percent)%)")
                .foregroundStyle(.secondary)
                .frame(width: 50, alignment: .trailing)
        }
    }
}

#Preview {
    let session = BoulderSession(
        level: .v4,
        targetCount: 10,
        attempts: (0..<10).map { i in
            BoulderAttempt(result: i < 3 ? .flash : i < 7 ? .done : .fail)
        }
    )
    NavigationStack {
        SessionSummaryView(session: session, onDone: {})
            .environmentObject(SessionStore())
    }
}
