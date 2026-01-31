import SwiftUI

/// Displays a list of past sessions with summary info.
struct SessionHistoryView: View {
    @EnvironmentObject var sessionStore: SessionStore

    private var sortedSessions: [BoulderSession] {
        sessionStore.sessions.sorted { $0.date > $1.date }
    }

    var body: some View {
        List {
            if sortedSessions.isEmpty {
                Text("No sessions yet.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(sortedSessions) { session in
                    sessionRow(session)
                }
                .onDelete { offsets in
                    sessionStore.deleteSession(at: offsets)
                }
            }
        }
        .navigationTitle("History")
    }

    private func sessionRow(_ session: BoulderSession) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(session.level.displayName)
                    .font(.headline)
                Spacer()
                Text(session.date, style: .date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 16) {
                label("Flash", count: session.flashCount, color: .yellow)
                label("Done", count: session.doneCount, color: .green)
                label("Fail", count: session.failCount, color: .red)
            }
            .font(.subheadline)
        }
        .padding(.vertical, 4)
    }

    private func label(_ text: String, count: Int, color: Color) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text("\(text): \(count)")
        }
    }
}

#Preview {
    NavigationStack {
        SessionHistoryView()
            .environmentObject(SessionStore())
    }
}
