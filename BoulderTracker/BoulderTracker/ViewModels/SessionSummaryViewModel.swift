import Foundation

/// ViewModel for displaying session results and next-level recommendation.
class SessionSummaryViewModel: ObservableObject {
    let session: BoulderSession
    let recommendedLevel: BoulderLevel
    let recommendationReason: String

    init(session: BoulderSession) {
        self.session = session
        self.recommendedLevel = LevelRecommendationService.recommendLevel(lastSession: session)
        self.recommendationReason = LevelRecommendationService.recommendationReason(lastSession: session)
    }

    var flashCount: Int { session.flashCount }
    var doneCount: Int { session.doneCount }
    var failCount: Int { session.failCount }
    var totalCount: Int { session.completedAttempts.count }

    var flashPercent: Int { percent(flashCount) }
    var donePercent: Int { percent(doneCount) }
    var failPercent: Int { percent(failCount) }

    /// Data for the pie chart: (label, count, color-name).
    var chartData: [(result: BoulderResult, count: Int)] {
        BoulderResult.allCases.map { result in
            let count: Int
            switch result {
            case .flash: count = flashCount
            case .done: count = doneCount
            case .fail: count = failCount
            }
            return (result, count)
        }.filter { $0.count > 0 }
    }

    private func percent(_ value: Int) -> Int {
        guard totalCount > 0 else { return 0 }
        return Int(round(Double(value) / Double(totalCount) * 100))
    }
}
