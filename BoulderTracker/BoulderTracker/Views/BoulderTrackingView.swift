import SwiftUI

/// Main tracking screen during an active session.
/// Shows the current boulder number and buttons to record Flash / Done / Fail.
struct BoulderTrackingView: View {
    @Binding var session: BoulderSession
    let onComplete: (BoulderSession) -> Void

    private var currentIndex: Int {
        session.completedAttempts.count
    }

    private var isFinished: Bool {
        session.isFinished
    }

    private var progress: Double {
        guard session.targetCount > 0 else { return 0 }
        return Double(session.completedAttempts.count) / Double(session.targetCount)
    }

    var body: some View {
        VStack(spacing: 32) {
            // Header
            VStack(spacing: 8) {
                Text("Boulder \(currentIndex + 1) of \(session.targetCount)")
                    .font(.title)
                    .fontWeight(.bold)

                Text("Level: \(session.level.displayName)")
                    .font(.title3)
                    .foregroundStyle(.secondary)

                ProgressView(value: progress)
                    .tint(.blue)
                    .padding(.horizontal)
            }

            // Quick stats
            HStack(spacing: 24) {
                StatBadge(label: "Flash", count: session.flashCount, color: .yellow)
                StatBadge(label: "Done", count: session.doneCount, color: .green)
                StatBadge(label: "Fail", count: session.failCount, color: .red)
            }

            Spacer()

            if isFinished {
                Button("View Results") {
                    onComplete(session)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            } else {
                // Result buttons
                VStack(spacing: 16) {
                    resultButton(.flash)
                    resultButton(.done)
                    resultButton(.fail)
                }
                .padding(.horizontal, 32)
            }

            Spacer()

            // Undo button
            if currentIndex > 0 && !isFinished {
                Button("Undo Last") {
                    guard currentIndex > 0 else { return }
                    session.attempts[currentIndex - 1].result = nil
                }
                .foregroundStyle(.secondary)
            }
        }
        .padding()
        .navigationTitle("Tracking")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
    }

    private func resultButton(_ result: BoulderResult) -> some View {
        Button {
            guard currentIndex < session.attempts.count else { return }
            session.attempts[currentIndex].result = result
            if session.isFinished {
                // Auto-navigate on last boulder
            }
        } label: {
            HStack {
                Text(result.emoji)
                Text(result.displayName)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
        }
        .buttonStyle(.bordered)
        .tint(result.color)
    }
}

/// Small badge showing a stat count.
private struct StatBadge: View {
    let label: String
    let count: Int
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(color)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    NavigationStack {
        BoulderTrackingView(
            session: .constant(BoulderSession(level: .v3, targetCount: 5)),
            onComplete: { _ in }
        )
    }
}
