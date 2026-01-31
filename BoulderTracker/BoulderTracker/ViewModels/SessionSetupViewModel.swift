import Foundation

/// ViewModel for configuring a new boulder session.
class SessionSetupViewModel: ObservableObject {
    @Published var boulderCount: Int = 20
    @Published var selectedLevel: BoulderLevel = .v0

    let recommendedLevel: BoulderLevel
    let recommendationReason: String

    init(lastSession: BoulderSession?) {
        self.recommendedLevel = LevelRecommendationService.recommendLevel(lastSession: lastSession)
        self.recommendationReason = LevelRecommendationService.recommendationReason(lastSession: lastSession)
        self.selectedLevel = recommendedLevel
    }

    var boulderCountRange: ClosedRange<Int> { 1...50 }

    func createSession() -> BoulderSession {
        BoulderSession(level: selectedLevel, targetCount: boulderCount)
    }
}
