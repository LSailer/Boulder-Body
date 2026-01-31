import Foundation

/// Calculates recommended boulder level based on session history.
struct LevelRecommendationService {

    /// Recommends the next level based on the most recent session.
    ///
    /// Rules:
    /// 1. If fail rate < 25%: level up (+1)
    /// 2. If fail rate >= 75%: level down (-1)
    /// 3. If last session was > 7 days ago: level down (-1, stacks with rule 2)
    /// 4. If last session was > 14 days ago: level down (-2 instead of -1 from rule 3)
    /// 5. If no previous session exists: default to V0
    static func recommendLevel(lastSession: BoulderSession?, now: Date = Date()) -> BoulderLevel {
        guard let session = lastSession else {
            return .v0
        }

        var level = session.level

        // Performance-based adjustment
        if session.failRate < 0.25 {
            level = level.adjusted(by: +1)
        } else if session.failRate >= 0.75 {
            level = level.adjusted(by: -1)
        }

        // Time-based adjustment
        let daysSinceLastSession = Calendar.current.dateComponents(
            [.day], from: session.date, to: now
        ).day ?? 0

        if daysSinceLastSession > 14 {
            level = level.adjusted(by: -2)
        } else if daysSinceLastSession > 7 {
            level = level.adjusted(by: -1)
        }

        return level
    }

    /// Returns a human-readable explanation of the recommendation.
    static func recommendationReason(lastSession: BoulderSession?, now: Date = Date()) -> String {
        guard let session = lastSession else {
            return "No previous sessions. Starting at V0."
        }

        var reasons: [String] = []
        let failPercent = Int(session.failRate * 100)

        if session.failRate < 0.25 {
            reasons.append("Strong performance last session (\(failPercent)% fail rate) — level up!")
        } else if session.failRate >= 0.75 {
            reasons.append("Tough session last time (\(failPercent)% fail rate) — dropping a level.")
        } else {
            reasons.append("Solid session last time (\(failPercent)% fail rate) — staying at current range.")
        }

        let daysSinceLastSession = Calendar.current.dateComponents(
            [.day], from: session.date, to: now
        ).day ?? 0

        if daysSinceLastSession > 14 {
            reasons.append("It's been \(daysSinceLastSession) days since your last session — dropping 2 levels for the break.")
        } else if daysSinceLastSession > 7 {
            reasons.append("It's been \(daysSinceLastSession) days since your last session — dropping 1 level for the break.")
        }

        return reasons.joined(separator: " ")
    }
}
