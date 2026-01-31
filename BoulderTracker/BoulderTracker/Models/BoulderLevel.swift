import Foundation

/// V-Scale bouldering grades from V0 (easiest) to V12 (hardest).
enum BoulderLevel: Int, Codable, CaseIterable, Identifiable, Comparable {
    case v0 = 0
    case v1 = 1
    case v2 = 2
    case v3 = 3
    case v4 = 4
    case v5 = 5
    case v6 = 6
    case v7 = 7
    case v8 = 8
    case v9 = 9
    case v10 = 10
    case v11 = 11
    case v12 = 12

    var id: Int { rawValue }

    var displayName: String {
        "V\(rawValue)"
    }

    static func < (lhs: BoulderLevel, rhs: BoulderLevel) -> Bool {
        lhs.rawValue < rhs.rawValue
    }

    /// Returns a level adjusted by the given offset, clamped to valid range.
    func adjusted(by offset: Int) -> BoulderLevel {
        let newRaw = max(0, min(BoulderLevel.allCases.count - 1, rawValue + offset))
        return BoulderLevel(rawValue: newRaw) ?? .v0
    }
}
