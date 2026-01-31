import Foundation

/// ViewModel for tracking boulder results during an active session.
class SessionViewModel: ObservableObject {
    @Published var session: BoulderSession

    init(session: BoulderSession) {
        self.session = session
    }

    var currentIndex: Int {
        session.currentBoulderIndex
    }

    var isFinished: Bool {
        session.isFinished
    }

    var progress: Double {
        guard session.targetCount > 0 else { return 0 }
        return Double(session.completedAttempts.count) / Double(session.targetCount)
    }

    func record(result: BoulderResult) {
        guard currentIndex < session.attempts.count else { return }
        session.attempts[currentIndex].result = result
    }

    func undoLast() {
        guard currentIndex > 0 else { return }
        session.attempts[currentIndex - 1].result = nil
    }
}
