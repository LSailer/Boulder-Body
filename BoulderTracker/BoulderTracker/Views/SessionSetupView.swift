import SwiftUI

/// Screen shown at app launch to configure a new bouldering session.
struct SessionSetupView: View {
    @EnvironmentObject var sessionStore: SessionStore
    @StateObject private var viewModel: SessionSetupViewModel
    let onStart: (BoulderSession) -> Void

    init(onStart: @escaping (BoulderSession) -> Void) {
        self.onStart = onStart
        // Placeholder — actual init uses .onAppear to set from sessionStore
        _viewModel = StateObject(wrappedValue: SessionSetupViewModel(lastSession: nil))
    }

    @State private var isReady = false

    var body: some View {
        Group {
            if isReady {
                setupForm
            } else {
                ProgressView()
            }
        }
        .onAppear {
            let vm = SessionSetupViewModel(lastSession: sessionStore.lastSession)
            // We re-create with proper last session on appear
            viewModel.selectedLevel = vm.recommendedLevel
            viewModel.boulderCount = 20
            isReady = true
        }
        .navigationTitle("New Session")
    }

    private var setupForm: some View {
        Form {
            Section {
                Stepper(
                    "Boulders: \(viewModel.boulderCount)",
                    value: $viewModel.boulderCount,
                    in: viewModel.boulderCountRange
                )
            } header: {
                Text("How many boulders?")
            }

            Section {
                Picker("Level", selection: $viewModel.selectedLevel) {
                    ForEach(BoulderLevel.allCases) { level in
                        Text(level.displayName).tag(level)
                    }
                }
                .pickerStyle(.wheel)
            } header: {
                Text("Select Level")
            } footer: {
                Text(viewModel.recommendationReason)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section {
                Button(action: {
                    let session = BoulderSession(
                        level: viewModel.selectedLevel,
                        targetCount: viewModel.boulderCount
                    )
                    onStart(session)
                }) {
                    Text("Start Session")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
            }

            if !sessionStore.sessions.isEmpty {
                Section {
                    NavigationLink("Session History") {
                        SessionHistoryView()
                    }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        SessionSetupView(onStart: { _ in })
            .environmentObject(SessionStore())
    }
}
