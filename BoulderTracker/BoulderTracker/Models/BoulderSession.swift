import Foundation

/// A complete bouldering session containing multiple attempts at a given level.
struct BoulderSession: Identifiable, Codable {
    let id: UUID
    let date: Date
    let level: BoulderLevel
    let targetCount: Int
    var attempts: [BoulderAttempt]

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        level: BoulderLevel,
        targetCount: Int,
        attempts: [BoulderAttempt]? = nil
    ) {
        self.id = id
        self.date = date
        self.level = level
        self.targetCount = targetCount
        self.attempts = attempts ?? (0..<targetCount).map { _ in BoulderAttempt() }
    }

    // MARK: - Computed Stats

    var completedAttempts: [BoulderAttempt] {
        attempts.filter { $0.isCompleted }
    }

    var isFinished: Bool {
        completedAttempts.count == targetCount
    }

    var currentBoulderIndex: Int {
        completedAttempts.count
    }

    var flashCount: Int {
        attempts.filter { $0.result == .flash }.count
    }

    var doneCount: Int {
        attempts.filter { $0.result == .done }.count
    }

    var failCount: Int {
        attempts.filter { $0.result == .fail }.count
    }

    var successCount: Int {
        flashCount + doneCount
    }

    /// Fail rate as a percentage (0.0 to 1.0).
    var failRate: Double {
        guard completedAttempts.count > 0 else { return 0 }
        return Double(failCount) / Double(completedAttempts.count)
    }

    /// Flash rate as a percentage (0.0 to 1.0).
    var flashRate: Double {
        guard completedAttempts.count > 0 else { return 0 }
        return Double(flashCount) / Double(completedAttempts.count)
    }
}
